package main

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func (a *App) current(c *gin.Context) (Identity, bool) {
	x, ok := c.Get("user")
	if !ok {
		return Identity{}, false
	}
	return x.(Identity), true
}

func (a *App) auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie("habiton_session")
		if err != nil {
			fail(c, 401, "Please log in")
			c.Abort()
			return
		}
		u := Identity{}
		err = a.DB.QueryRow(c.Request.Context(), `SELECT u.id::text,u.name,u.email,u.hero_class,u.xp,u.is_demo FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND (NOT $2 OR u.email_verified_at IS NOT NULL OR ($3 AND u.is_demo))`, hash(token), a.EmailAuth != nil, env("DEMO_MODE", "false") == "true").Scan(&u.ID, &u.Name, &u.Email, &u.Class, &u.XP, &u.Demo)
		if err != nil {
			fail(c, 401, "Session expired; log in again")
			c.Abort()
			return
		}
		c.Set("user", u)
		c.Next()
	}
}

func sessionCookie(c *gin.Context, token string, seconds int) {
	secure := os.Getenv("COOKIE_SECURE") == "true"
	http.SetCookie(c.Writer, &http.Cookie{Name: "habiton_session", Value: token, Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode, MaxAge: seconds})
}

func (a *App) createSession(c *gin.Context, u Identity) error {
	token := newToken()
	_, err := a.DB.Exec(c.Request.Context(), sessionInsert, hash(token), u.ID)
	if err != nil {
		return err
	}
	sessionCookie(c, token, 14*86400)
	return nil
}

const sessionInsert = `INSERT INTO sessions(token_hash,user_id,expires_at)
	VALUES($1,$2,now()+interval '14 days')`

func commitSession(c *gin.Context, tx pgx.Tx, u Identity) error {
	ctx := c.Request.Context()
	token := newToken()
	if _, err := tx.Exec(ctx, sessionInsert, hash(token), u.ID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	sessionCookie(c, token, 14*86400)
	return nil
}

func publicUser(u Identity) gin.H {
	return gin.H{"id": u.ID, "name": u.Name, "email": u.Email, "hero_class": u.Class, "xp": u.XP, "level": 1 + u.XP/100, "xp_in_level": u.XP % 100, "xp_next": 100, "is_demo": u.Demo, "is_admin": isAdmin(u)}
}

func (a *App) register(c *gin.Context) {
	var v struct{ Name, Email, Password, Code string }
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid details")
		return
	}
	v.Name = strings.TrimSpace(v.Name)
	v.Email = strings.ToLower(strings.TrimSpace(v.Email))
	if len(v.Name) < 2 || len(v.Name) > 70 || !validEmail(v.Email) || len(v.Password) < 8 || len(v.Password) > 72 {
		fail(c, 400, "Name, email and password (8–72 characters) required")
		return
	}
	if adminEmail := configuredAdminEmail(); adminEmail != "" && v.Email == adminEmail {
		fail(c, 409, "Email already exists")
		return
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Could not create account")
		return
	}
	defer tx.Rollback(ctx)
	if a.EmailAuth != nil && !a.checkEmailCode(c, tx, v.Email, "signup", v.Code) {
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(v.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(c, 500, "Password error")
		return
	}
	u := Identity{ID: newID(), Name: v.Name, Email: v.Email, Class: "Mage"}
	result, err := tx.Exec(ctx, `INSERT INTO users(id,name,email,password_hash,email_verified_at)
		VALUES($1,$2,$3,$4,CASE WHEN $5 THEN now() END) ON CONFLICT (email) DO NOTHING`,
		u.ID, u.Name, u.Email, string(password), a.EmailAuth != nil)
	if err != nil {
		fail(c, 500, "Could not create account")
		return
	}
	if result.RowsAffected() == 0 {
		fail(c, 409, "Email already exists")
		return
	}
	if err := commitSession(c, tx, u); err != nil {
		fail(c, 500, "Could not create session")
		return
	}
	a.event(ctx, u, "sign_up_completed", nil)
	c.JSON(200, gin.H{"user": publicUser(u)})
}

func (a *App) login(c *gin.Context) {
	var v struct{ Email, Password string }
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid login")
		return
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 503, "Database unavailable")
		return
	}
	defer tx.Rollback(ctx)
	u := Identity{}
	var password string
	var verified bool
	err = tx.QueryRow(ctx, `SELECT id::text,name,email,hero_class,xp,is_demo,password_hash,email_verified_at IS NOT NULL FROM users WHERE email=$1 FOR SHARE`, strings.ToLower(strings.TrimSpace(v.Email))).Scan(&u.ID, &u.Name, &u.Email, &u.Class, &u.XP, &u.Demo, &password, &verified)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(password), []byte(v.Password)) != nil {
		fail(c, 401, "Invalid email or password")
		return
	}
	if a.EmailAuth != nil && !verified && !(u.Demo && env("DEMO_MODE", "false") == "true") {
		c.JSON(403, gin.H{"error": "Verify your email by resetting your password.", "code": "email_unverified"})
		return
	}
	if err := commitSession(c, tx, u); err != nil {
		fail(c, 500, "Could not create session")
		return
	}
	a.event(ctx, u, "login_completed", nil)
	c.JSON(200, gin.H{"user": publicUser(u)})
}

func (a *App) logout(c *gin.Context) {
	token, _ := c.Cookie("habiton_session")
	a.DB.Exec(c.Request.Context(), `DELETE FROM sessions WHERE token_hash=$1`, hash(token))
	sessionCookie(c, "", -1)
	c.JSON(200, gin.H{"ok": true})
}

func (a *App) me(c *gin.Context) { u, _ := a.current(c); c.JSON(200, gin.H{"user": publicUser(u)}) }

func (a *App) updateMe(c *gin.Context) {
	u, _ := a.current(c)
	var v struct {
		Name      string `json:"name"`
		HeroClass string `json:"hero_class"`
	}
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid details")
		return
	}
	if v.Name != "" {
		v.Name = strings.TrimSpace(v.Name)
		if len(v.Name) < 2 || len(v.Name) > 70 {
			fail(c, 400, "Invalid name")
			return
		}
		u.Name = v.Name
	}
	if v.HeroClass != "" {
		if v.HeroClass != "Warrior" && v.HeroClass != "Mage" && v.HeroClass != "Priest" {
			fail(c, 400, "Invalid class")
			return
		}
		u.Class = v.HeroClass
	}
	_, err := a.DB.Exec(c.Request.Context(), `UPDATE users SET name=$2,hero_class=$3 WHERE id=$1`, u.ID, u.Name, u.Class)
	if err != nil {
		fail(c, 500, "Save failed")
		return
	}
	c.JSON(200, gin.H{"user": publicUser(u)})
}
