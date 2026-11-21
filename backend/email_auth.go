package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/mail"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type emailAuth struct {
	key  []byte
	send func(to, purpose, code string) error
}

func validEmail(email string) bool {
	addr, err := mail.ParseAddress(email)
	return err == nil && len(email) <= 254 && addr.Address == email && !strings.ContainsAny(email, "\r\n")
}

func (a *App) authOptions(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.JSON(200, gin.H{"email_codes": a.EmailAuth != nil, "google": a.GoogleAuth != nil})
}

func (e *emailAuth) digest(email, purpose, code string) string {
	mac := hmac.New(sha256.New, e.key)
	fmt.Fprintf(mac, "%s\x00%s\x00%s", email, purpose, code)
	return hex.EncodeToString(mac.Sum(nil))
}

func (a *App) requestEmailCode(c *gin.Context) {
	if a.EmailAuth == nil {
		fail(c, 503, "Email delivery is unavailable.")
		return
	}
	var input struct{ Email, Purpose string }
	if c.ShouldBindJSON(&input) != nil {
		fail(c, 400, "Invalid details")
		return
	}
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !validEmail(email) || (input.Purpose != "signup" && input.Purpose != "login" && input.Purpose != "reset") {
		fail(c, 400, "Invalid details")
		return
	}

	ctx := c.Request.Context()
	var exists, verified, demo bool
	err := a.DB.QueryRow(ctx, `SELECT true,email_verified_at IS NOT NULL,is_demo FROM users WHERE email=$1`, email).
		Scan(&exists, &verified, &demo)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		fail(c, 500, "Could not request a code.")
		return
	}
	c.JSON(202, gin.H{"ok": true})
	c.Writer.WriteHeaderNow()

	if demo || (input.Purpose == "signup" && (exists || email == configuredAdminEmail())) ||
		(input.Purpose == "login" && !verified) || (input.Purpose == "reset" && !exists) {
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Second)
	defer cancel()
	value, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		log.Print("Could not generate email code")
		return
	}
	code := fmt.Sprintf("%06d", value.Int64())
	digest := a.EmailAuth.digest(email, input.Purpose, code)
	issued, err := a.storeEmailCode(ctx, email, input.Purpose, digest)
	if err != nil {
		log.Print("Could not save email code")
		return
	}
	if issued {
		if err := a.EmailAuth.send(email, input.Purpose, code); err != nil {
			// Keep the cooldown and attempt limits even when the mail server fails.
			log.Print("SMTP could not deliver an authentication code")
		}
	}
}

func (a *App) storeEmailCode(ctx context.Context, email, purpose, digest string) (bool, error) {
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	// Limit total sends across API instances, including requests to many different addresses.
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(74183, 1)"); err != nil {
		return false, err
	}
	var recent int
	if err := tx.QueryRow(ctx, "SELECT count(*) FROM email_codes WHERE sent_at>now()-interval '1 minute'").Scan(&recent); err != nil {
		return false, err
	}
	if recent >= 60 {
		return false, nil
	}
	if _, err := tx.Exec(ctx, "DELETE FROM email_codes WHERE expires_at<now()-interval '1 day'"); err != nil {
		return false, err
	}
	result, err := tx.Exec(ctx, `INSERT INTO email_codes(email,purpose,digest,expires_at)
		VALUES($1,$2,$3,now()+interval '10 minutes')
		ON CONFLICT(email,purpose) DO UPDATE SET digest=EXCLUDED.digest,sent_at=now(),
			expires_at=CASE WHEN email_codes.expires_at<=now() THEN EXCLUDED.expires_at ELSE email_codes.expires_at END,
			attempts=CASE WHEN email_codes.expires_at<=now() THEN 0 ELSE email_codes.attempts END
		WHERE email_codes.sent_at<=now()-interval '1 minute'
			AND (email_codes.expires_at<=now() OR email_codes.attempts<5)`, email, purpose, digest)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, tx.Commit(ctx)
}

// A successful check consumes the code in the caller's transaction. An incorrect
// attempt commits its counter even though the caller will not change the account.
func (a *App) checkEmailCode(c *gin.Context, tx pgx.Tx, email, purpose, code string) bool {
	ctx := c.Request.Context()
	digest := a.EmailAuth.digest(email, purpose, code)
	var expected string
	err := tx.QueryRow(ctx, `UPDATE email_codes SET attempts=attempts+1
		WHERE email=$1 AND purpose=$2 AND expires_at>clock_timestamp() AND attempts<5
		RETURNING digest`, email, purpose).Scan(&expected)
	if errors.Is(err, pgx.ErrNoRows) {
		fail(c, 400, "Invalid or expired email code.")
		return false
	}
	if err != nil {
		fail(c, 500, "Could not check the code.")
		return false
	}
	if !hmac.Equal([]byte(expected), []byte(digest)) {
		if err := tx.Commit(ctx); err != nil {
			fail(c, 500, "Could not check the code.")
			return false
		}
		fail(c, 400, "Invalid or expired email code.")
		return false
	}
	// Retain the cooldown so replay and immediate resend do not bypass throttling.
	if _, err := tx.Exec(ctx, `UPDATE email_codes SET attempts=5 WHERE email=$1 AND purpose=$2`, email, purpose); err != nil {
		fail(c, 500, "Could not check the code.")
		return false
	}
	return true
}

func (a *App) loginWithEmailCode(c *gin.Context) {
	if a.EmailAuth == nil {
		fail(c, 503, "Email delivery is unavailable.")
		return
	}
	var input struct{ Email, Code string }
	if c.ShouldBindJSON(&input) != nil {
		fail(c, 400, "Invalid details")
		return
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Could not start login.")
		return
	}
	defer tx.Rollback(ctx)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !a.checkEmailCode(c, tx, email, "login", input.Code) {
		return
	}
	var u Identity
	err = tx.QueryRow(ctx, `SELECT id::text,name,email,hero_class,xp,is_demo FROM users
		WHERE email=$1 AND email_verified_at IS NOT NULL AND NOT is_demo FOR SHARE`, email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Class, &u.XP, &u.Demo)
	if err != nil || commitSession(c, tx, u) != nil {
		fail(c, 500, "Could not finish login.")
		return
	}
	a.event(ctx, u, "login_completed", nil)
	c.JSON(200, gin.H{"user": publicUser(u)})
}

func (a *App) resetPassword(c *gin.Context) {
	if a.EmailAuth == nil {
		fail(c, 503, "Email delivery is unavailable.")
		return
	}
	var input struct{ Email, Code, Password string }
	if c.ShouldBindJSON(&input) != nil || len(input.Password) < 8 || len(input.Password) > 72 {
		fail(c, 400, "Password must be 8–72 bytes.")
		return
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Could not reset password.")
		return
	}
	defer tx.Rollback(ctx)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !a.checkEmailCode(c, tx, email, "reset", input.Code) {
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(c, 500, "Could not reset password.")
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE email_codes SET attempts=5 WHERE email=$1 AND purpose='login'`, email); err != nil {
		fail(c, 500, "Could not reset password.")
		return
	}
	var id string
	err = tx.QueryRow(ctx, `UPDATE users SET password_hash=$2,email_verified_at=COALESCE(email_verified_at,now())
		WHERE email=$1 AND NOT is_demo RETURNING id::text`, email, string(password)).Scan(&id)
	if err != nil {
		fail(c, 500, "Could not reset password.")
		return
	}
	if _, err := tx.Exec(ctx, `DELETE FROM sessions WHERE user_id=$1`, id); err != nil {
		fail(c, 500, "Could not reset password.")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		fail(c, 500, "Could not reset password.")
		return
	}
	sessionCookie(c, "", -1)
	c.JSON(200, gin.H{"ok": true})
}
