package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

type googleTestTransport func(*http.Request) (*http.Response, error)

func (f googleTestTransport) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }

func TestEmailAndGoogleAuthPostgres(t *testing.T) {
	ctx, db := integrationDB(t)
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("DEMO_MODE", "false")
	codes := make(map[string]string)
	sends := 0
	a := &App{
		DB: db,
		EmailAuth: &emailAuth{key: []byte(strings.Repeat("x", 32)), send: func(to, purpose, code string) error {
			codes[to+":"+purpose] = code
			sends++
			return nil
		}},
		GoogleAuth: &googleAuth{id: "test-client", secret: "test-secret", redirectURL: "http://localhost:3000/api/auth/google/callback"},
	}
	router := gin.New()
	router.POST("/request", a.requestEmailCode)
	router.POST("/register", a.register)
	router.POST("/login", a.login)
	router.POST("/code-login", a.loginWithEmailCode)
	router.POST("/reset", a.resetPassword)
	router.GET("/me", a.auth(), a.me)
	router.GET("/google", a.startGoogleLogin)
	router.GET(googleCallbackPath, a.finishGoogleLogin)

	call := func(method, path string, fields map[string]string, want int, cookies ...*http.Cookie) *httptest.ResponseRecorder {
		t.Helper()
		body, err := json.Marshal(fields)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(method, path, strings.NewReader(string(body))).WithContext(ctx)
		req.Header.Set("Content-Type", "application/json")
		for _, cookie := range cookies {
			req.AddCookie(cookie)
		}
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		if res.Code != want {
			t.Fatalf("%s %s returned %d, expected %d: %s", method, path, res.Code, want, res.Body)
		}
		return res
	}
	cookie := func(res *httptest.ResponseRecorder, name string) *http.Cookie {
		t.Helper()
		for _, cookie := range res.Result().Cookies() {
			if cookie.Name == name && cookie.Value != "" {
				return cookie
			}
		}
		t.Fatalf("missing cookie %s", name)
		return nil
	}
	request := func(email, purpose string) {
		t.Helper()
		call(http.MethodPost, "/request", map[string]string{"email": email, "purpose": purpose}, 202)
	}
	age := func(email, purpose string) {
		t.Helper()
		_, err := db.Exec(ctx, `UPDATE email_codes SET expires_at=now()-interval '1 second',
			sent_at=now()-interval '11 minutes' WHERE email=$1 AND purpose=$2`, email, purpose)
		if err != nil {
			t.Fatal(err)
		}
	}

	email := "student@example.test"
	password := "initial-password"
	form := map[string]string{"email": email, "name": "Student", "password": password}
	call(http.MethodPost, "/register", form, 400)
	request(email, "signup")
	request(email, "signup")
	if sends != 1 {
		t.Fatalf("resend cooldown ignored: %d messages", sends)
	}
	form["code"] = codes[email+":signup"]
	signedUp := call(http.MethodPost, "/register", form, 200)
	originalSession := cookie(signedUp, "habiton_session")
	call(http.MethodPost, "/register", form, 400)
	call(http.MethodGet, "/me", nil, 200, originalSession)

	request(email, "login")
	loginCode := codes[email+":login"]
	login := map[string]string{"email": email, "code": loginCode}
	loginSession := cookie(call(http.MethodPost, "/code-login", login, 200), "habiton_session")
	call(http.MethodPost, "/code-login", login, 400)
	age(email, "login")
	request(email, "login")
	login["code"] = codes[email+":login"]
	age(email, "login")
	call(http.MethodPost, "/code-login", login, 400)

	request(email, "reset")
	resetCode := codes[email+":reset"]
	wrong := resetCode[:5] + "0"
	if wrong == resetCode {
		wrong = resetCode[:5] + "1"
	}
	form["password"] = "changed-password"
	form["code"] = wrong
	for i := 0; i < 5; i++ {
		call(http.MethodPost, "/reset", form, 400)
	}
	form["code"] = resetCode
	call(http.MethodPost, "/reset", form, 400)
	age(email, "reset")
	request(email, "reset")
	form["code"] = codes[email+":reset"]
	call(http.MethodPost, "/reset", form, 200)
	call(http.MethodGet, "/me", nil, 401, originalSession)
	call(http.MethodGet, "/me", nil, 401, loginSession)
	call(http.MethodPost, "/login", map[string]string{"email": email, "password": password}, 401)
	call(http.MethodPost, "/login", form, 200)

	// Simulate a pre-migration account. Reset verifies its email without changing its identity.
	var id string
	if err := db.QueryRow(ctx, "UPDATE users SET email_verified_at=NULL WHERE email=$1 RETURNING id::text", email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	call(http.MethodPost, "/login", form, 403)
	age(email, "reset")
	request(email, "reset")
	form["code"] = codes[email+":reset"]
	call(http.MethodPost, "/reset", form, 200)
	var confirmedID string
	if err := db.QueryRow(ctx, "SELECT id::text FROM users WHERE email=$1 AND email_verified_at IS NOT NULL", email).Scan(&confirmedID); err != nil || confirmedID != id {
		t.Fatalf("legacy account identity not preserved: %v", err)
	}

	googleEmail, googleSubject := "student@gmail.com", "google-student"
	tokenRequests := 0
	var expectedVerifier string
	a.Client = &http.Client{Transport: googleTestTransport(func(req *http.Request) (*http.Response, error) {
		var data any
		switch req.URL.Host {
		case "oauth2.googleapis.com":
			tokenRequests++
			if req.ParseForm() != nil || req.Form.Get("code_verifier") != expectedVerifier || req.Form.Get("code") != "test-code" {
				t.Error("missing Google PKCE verifier or authorization code")
			}
			data = gin.H{"access_token": "test-access-token"}
		case "openidconnect.googleapis.com":
			if req.Header.Get("Authorization") != "Bearer test-access-token" {
				t.Error("missing Google access token")
			}
			data = gin.H{"sub": googleSubject, "email": googleEmail, "email_verified": true, "name": "Student", "hd": "example.test"}
		default:
			t.Fatalf("unexpected OAuth destination %s", req.URL.Host)
		}
		body, _ := json.Marshal(data)
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(body)))}, nil
	})}

	google := func(correctState bool) *httptest.ResponseRecorder {
		t.Helper()
		start := call(http.MethodGet, "/google", nil, 303)
		location, err := url.Parse(start.Header().Get("Location"))
		if err != nil || location.Host != "accounts.google.com" || location.Query().Get("code_challenge_method") != "S256" {
			t.Fatalf("invalid Google authorization redirect: %v", err)
		}
		flow := cookie(start, a.GoogleAuth.cookieName())
		state := location.Query().Get("state")
		_, expectedVerifier, _ = strings.Cut(flow.Value, ".")
		if !correctState {
			state = "incorrect"
		}
		return call(http.MethodGet, googleCallbackPath+"?code=test-code&state="+url.QueryEscape(state), nil, 303, flow)
	}
	if location := google(false).Header().Get("Location"); location != "/login?google=failed" || tokenRequests != 0 {
		t.Fatalf("invalid OAuth state accepted: %s", location)
	}
	result := google(true)
	if result.Header().Get("Location") != "/today" {
		t.Fatalf("Google login failed: %s", result.Header().Get("Location"))
	}
	call(http.MethodGet, "/me", nil, 200, cookie(result, "habiton_session"))

	googleEmail, googleSubject = email, "different-subject"
	if location := google(true).Header().Get("Location"); location != "/login?google=existing" {
		t.Fatalf("Google linked to an unrelated existing account: %s", location)
	}

	a.EmailAuth = nil
	legacy := map[string]string{"email": "local@example.test", "name": "Local student", "password": "local-password"}
	legacySession := cookie(call(http.MethodPost, "/register", legacy, 200), "habiton_session")
	call(http.MethodGet, "/me", nil, 200, legacySession)
	call(http.MethodPost, "/login", legacy, 200)

}
