package main

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
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
			return
		}
		u := Identity{}
		err = a.DB.QueryRow(c.Request.Context(), `SELECT u.id::text,u.name,u.email,u.hero_class,u.xp,u.is_demo FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`, hash(token)).Scan(&u.ID, &u.Name, &u.Email, &u.Class, &u.XP, &u.Demo)
		if err != nil {
			fail(c, 401, "Session expired; log in again")
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

func (a *App) setSession(c *gin.Context, u Identity) {
	token := newToken()
	_, err := a.DB.Exec(c.Request.Context(), `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '14 days')`, hash(token), u.ID)
	if err != nil {
		fail(c, 500, "Could not create session")
		return
	}
	sessionCookie(c, token, 14*86400)
	c.JSON(200, gin.H{"user": publicUser(u)})
}

func publicUser(u Identity) gin.H {
	return gin.H{"id": u.ID, "name": u.Name, "email": u.Email, "hero_class": u.Class, "xp": u.XP, "level": 1 + u.XP/100, "xp_in_level": u.XP % 100, "xp_next": 100, "is_demo": u.Demo}
}

func (a *App) register(c *gin.Context) {
	var v struct{ Name, Email, Password string }
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid details")
		return
	}
	v.Name = strings.TrimSpace(v.Name)
	v.Email = strings.ToLower(strings.TrimSpace(v.Email))
	if len(v.Name) < 2 || len(v.Name) > 70 || !strings.Contains(v.Email, "@") || len(v.Email) > 254 || len(v.Password) < 8 || len(v.Password) > 72 {
		fail(c, 400, "Name, email and password (8–72 characters) required")
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(v.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(c, 500, "Password error")
		return
	}
	u := Identity{ID: newID(), Name: v.Name, Email: v.Email, Class: "Mage"}
	_, err = a.DB.Exec(c.Request.Context(), `INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)`, u.ID, u.Name, u.Email, string(password))
	if err != nil {
		fail(c, 409, "Email already exists")
		return
	}
	a.event(c.Request.Context(), u, "sign_up_completed", nil)
	a.setSession(c, u)
}

func (a *App) login(c *gin.Context) {
	var v struct{ Email, Password string }
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid login")
		return
	}
	u := Identity{}
	var password string
	err := a.DB.QueryRow(c.Request.Context(), `SELECT id::text,name,email,hero_class,xp,is_demo,password_hash FROM users WHERE email=$1`, strings.ToLower(strings.TrimSpace(v.Email))).Scan(&u.ID, &u.Name, &u.Email, &u.Class, &u.XP, &u.Demo, &password)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(password), []byte(v.Password)) != nil {
		fail(c, 401, "Invalid email or password")
		return
	}
	a.event(c.Request.Context(), u, "login_completed", nil)
	a.setSession(c, u)
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
