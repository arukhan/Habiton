package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type App struct {
	DB           *pgxpool.Pool
	Client       *http.Client
	AmplitudeKey string
	EmailAuth    *emailAuth
	GoogleAuth   *googleAuth
}
type Identity struct {
	ID, Name, Email, Class string
	XP                     int
	Demo                   bool
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	h := hex.EncodeToString(b)
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}

func newToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func hash(s string) string { h := sha256.Sum256([]byte(s)); return hex.EncodeToString(h[:]) }

func fail(c *gin.Context, code int, msg string) { c.AbortWithStatusJSON(code, gin.H{"error": msg}) }

func (a *App) event(ctx context.Context, u Identity, name string, props gin.H) {
	if props == nil {
		props = gin.H{}
	}
	data, _ := json.Marshal(props)
	_, err := a.DB.Exec(ctx, `INSERT INTO analytics_events(id,user_id,name,properties,is_demo) VALUES($1,$2,$3,$4,$5)`, newID(), u.ID, name, data, u.Demo)
	if err != nil {
		log.Printf("event storage failed: %v", err)
		return
	}
	if a.AmplitudeKey == "" || u.Demo {
		return
	}
	payload, _ := json.Marshal(gin.H{"api_key": a.AmplitudeKey, "events": []gin.H{{"user_id": u.ID, "event_type": name, "event_properties": props, "insert_id": newID(), "time": time.Now().UnixMilli()}}})
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, "POST", "https://api2.amplitude.com/2/httpapi", strings.NewReader(string(payload)))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := a.Client.Do(req)
		if err != nil {
			log.Printf("Amplitude: %v", err)
			return
		}
		resp.Body.Close()
		if resp.StatusCode >= 300 {
			log.Printf("Amplitude HTTP %d", resp.StatusCode)
		}
	}()
}

func localDate() string {
	loc, err := time.LoadLocation("Asia/Almaty")
	if err != nil {
		return time.Now().UTC().Format("2006-01-02")
	}
	return time.Now().In(loc).Format("2006-01-02")
}
