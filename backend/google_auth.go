package main

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

const googleCallbackPath = "/api/auth/google/callback"

type googleAuth struct {
	id, secret, redirectURL string
	secureCookie            bool
}

func (a *App) configureGoogle() error {
	id, secret, redirect := os.Getenv("GOOGLE_CLIENT_ID"), os.Getenv("GOOGLE_CLIENT_SECRET"), os.Getenv("GOOGLE_REDIRECT_URL")
	if id == "" && secret == "" && redirect == "" {
		return nil
	}
	u, err := url.Parse(redirect)
	if id == "" || secret == "" || err != nil || u.Hostname() == "" || u.User != nil ||
		u.Path != googleCallbackPath || u.RawQuery != "" || u.Fragment != "" ||
		(u.Scheme != "https" && !(u.Scheme == "http" && u.Hostname() == "localhost")) {
		return fmt.Errorf("Google login requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and a valid GOOGLE_REDIRECT_URL ending in %s", googleCallbackPath)
	}
	a.GoogleAuth = &googleAuth{id: id, secret: secret, redirectURL: redirect, secureCookie: u.Scheme == "https"}
	return nil
}

func (g *googleAuth) cookieName() string {
	if g.secureCookie {
		return "__Host-habiton_google_flow"
	}
	return "habiton_google_flow"
}

func (g *googleAuth) flowCookie(c *gin.Context, value string, maxAge int) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name: g.cookieName(), Value: value, Path: "/", MaxAge: maxAge,
		HttpOnly: true, Secure: g.secureCookie, SameSite: http.SameSiteLaxMode,
	})
}

func (a *App) startGoogleLogin(c *gin.Context) {
	g := a.GoogleAuth
	if g == nil {
		fail(c, 404, "Google login is unavailable.")
		return
	}
	state, verifier := newToken(), newToken()
	challenge := sha256.Sum256([]byte(verifier))
	g.flowCookie(c, state+"."+verifier, 600)
	query := url.Values{
		"client_id": {g.id}, "redirect_uri": {g.redirectURL}, "response_type": {"code"},
		"scope": {"openid email profile"}, "state": {state},
		"code_challenge": {base64.RawURLEncoding.EncodeToString(challenge[:])}, "code_challenge_method": {"S256"},
	}
	c.Header("Cache-Control", "no-store")
	c.Redirect(http.StatusSeeOther, "https://accounts.google.com/o/oauth2/v2/auth?"+query.Encode())
}

type googleProfile struct {
	Subject      string `json:"sub"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Verified     bool   `json:"email_verified"`
	HostedDomain string `json:"hd"`
}

// The access token comes from Google's token endpoint for this OAuth client.
// UserInfo is fetched directly over TLS using that token.
func (a *App) fetchGoogleProfile(ctx context.Context, code, verifier string) (googleProfile, error) {
	g := a.GoogleAuth
	form := url.Values{
		"code": {code}, "client_id": {g.id}, "client_secret": {g.secret},
		"redirect_uri": {g.redirectURL}, "grant_type": {"authorization_code"}, "code_verifier": {verifier},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return googleProfile{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := a.Client.Do(req)
	if err != nil {
		return googleProfile{}, err
	}
	defer response.Body.Close()
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if response.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(response.Body, 65536)).Decode(&token) != nil || token.AccessToken == "" {
		return googleProfile{}, errors.New("Google token exchange failed")
	}
	req, err = http.NewRequestWithContext(ctx, http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return googleProfile{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	response, err = a.Client.Do(req)
	if err != nil {
		return googleProfile{}, err
	}
	defer response.Body.Close()
	var profile googleProfile
	if response.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(response.Body, 65536)).Decode(&profile) != nil {
		return googleProfile{}, errors.New("Google user info failed")
	}
	profile.Email = strings.ToLower(strings.TrimSpace(profile.Email))
	// For external addresses Google may no longer be authoritative about ownership.
	if profile.Subject == "" || !profile.Verified || !validEmail(profile.Email) ||
		(!strings.HasSuffix(profile.Email, "@gmail.com") && profile.HostedDomain == "") {
		return googleProfile{}, errors.New("Google account email cannot be verified")
	}
	return profile, nil
}

func (a *App) finishGoogleLogin(c *gin.Context) {
	g := a.GoogleAuth
	if g == nil {
		fail(c, 404, "Google login is unavailable.")
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("Referrer-Policy", "no-referrer")
	flow, _ := c.Cookie(g.cookieName())
	g.flowCookie(c, "", -1)
	state, verifier, ok := strings.Cut(flow, ".")
	code := c.Query("code")
	if !ok || len(state) != 64 || len(verifier) != 64 || code == "" ||
		subtle.ConstantTimeCompare([]byte(state), []byte(c.Query("state"))) != 1 {
		c.Redirect(http.StatusSeeOther, "/login?google=failed")
		return
	}
	ctx := c.Request.Context()
	profile, err := a.fetchGoogleProfile(ctx, code, verifier)
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/login?google=failed")
		return
	}
	var u Identity
	find := func() error {
		return a.DB.QueryRow(ctx, `SELECT id::text,name,email,hero_class,xp,is_demo FROM users
			WHERE google_subject=$1 AND NOT is_demo`, profile.Subject).
			Scan(&u.ID, &u.Name, &u.Email, &u.Class, &u.XP, &u.Demo)
	}
	err = find()
	if errors.Is(err, pgx.ErrNoRows) && profile.Email != configuredAdminEmail() {
		name := strings.TrimSpace(profile.Name)
		if count := utf8.RuneCountInString(name); count < 2 || count > 70 {
			name = "Adventurer"
		}
		result, insertErr := a.DB.Exec(ctx, `INSERT INTO users(id,name,email,password_hash,email_verified_at,google_subject)
			VALUES($1,$2,$3,'',now(),$4) ON CONFLICT DO NOTHING`, newID(), name, profile.Email, profile.Subject)
		if insertErr == nil {
			err = find()
			if err == nil && result.RowsAffected() == 1 {
				a.event(ctx, u, "sign_up_completed", nil)
			}
		} else {
			err = insertErr
		}
	}
	if errors.Is(err, pgx.ErrNoRows) {
		c.Redirect(http.StatusSeeOther, "/login?google=existing")
		return
	}
	if err != nil || a.createSession(c, u) != nil {
		c.Redirect(http.StatusSeeOther, "/login?google=failed")
		return
	}
	a.event(ctx, u, "login_completed", nil)
	c.Redirect(http.StatusSeeOther, "/today")
}
