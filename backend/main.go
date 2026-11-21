package main

import (
	"context"
	"embed"
	"log"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

func buildVersion() string {
	if version := os.Getenv("APP_VERSION"); version != "" {
		return version
	}
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, setting := range info.Settings {
			if setting.Key == "vcs.revision" {
				return setting.Value
			}
		}
	}
	return "unknown"
}

func main() {
	dsn := env("DATABASE_URL", "postgres://habiton:habiton_local_only@localhost:5432/habiton?sslmode=disable")
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err = db.Ping(ctx); err != nil {
		log.Fatalf("Database unavailable: %v", err)
	}
	migrations, err := migrationFS.ReadDir("migrations")
	if err != nil {
		log.Fatal(err)
	}
	for _, migration := range migrations {
		sql, err := migrationFS.ReadFile("migrations/" + migration.Name())
		if err != nil {
			log.Fatal(err)
		}
		if _, err := db.Exec(context.Background(), string(sql)); err != nil {
			log.Fatalf("Schema init failed (%s): %v", migration.Name(), err)
		}
	}
	a := &App{DB: db, Client: &http.Client{Timeout: 8 * time.Second}, AmplitudeKey: os.Getenv("AMPLITUDE_API_KEY")}
	if err := a.configureAuth(); err != nil {
		log.Fatal(err)
	}
	if env("DEMO_MODE", "false") == "true" {
		if err = a.seedDemoAccounts(context.Background()); err != nil {
			log.Fatalf("Demo seed failed: %v", err)
		}
	}
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.LoggerWithConfig(gin.LoggerConfig{SkipPaths: []string{"/api/auth/google/callback"}}), gin.Recovery())

	r.Use(func(c *gin.Context) {
		method := c.Request.Method

		if method == http.MethodPost ||
			method == http.MethodPatch ||
			method == http.MethodPut ||
			method == http.MethodDelete {

			origin := c.Request.Header.Get("Origin")

			if origin != "" {
				allowedOrigins := strings.Split(
					env("APP_ORIGIN", "http://localhost:3000"),
					",",
				)

				trusted := false

				for _, allowed := range allowedOrigins {
					if origin == strings.TrimSpace(allowed) {
						trusted = true
						break
					}
				}

				if !trusted {
					fail(c, http.StatusForbidden, "Untrusted request origin")
					c.Abort()
					return
				}
			}
		}

		if method == http.MethodPost && strings.HasPrefix(c.Request.URL.Path, "/api/auth/") {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
		}

		c.Next()
	})

	version := buildVersion()
	r.GET("/api/health", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.JSON(200, gin.H{"status": "ok", "service": "habiton-backend", "version": version})
	})
	r.POST("/api/auth/register", a.register)
	r.POST("/api/auth/login", a.login)
	r.GET("/api/auth/options", a.authOptions)
	r.POST("/api/auth/email/request", a.requestEmailCode)
	r.POST("/api/auth/email/login", a.loginWithEmailCode)
	r.POST("/api/auth/email/reset", a.resetPassword)
	r.GET("/api/auth/google", a.startGoogleLogin)
	r.GET("/api/auth/google/callback", a.finishGoogleLogin)
	secure := r.Group("/api")
	secure.Use(a.auth())
	secure.POST("/auth/logout", a.logout)
	secure.GET("/me", a.me)
	secure.PATCH("/me", a.updateMe)
	secure.GET("/me/reward", a.personalReward)
	secure.POST("/me/reward", a.startPersonalReward)
	secure.GET("/habits", a.habits)
	secure.GET("/habits/recovery-limits", a.habitRecoveryLimits)
	secure.GET("/habits/week", a.habitWeek)
	secure.GET("/habits/:id/missed-dates", a.missedDates)
	secure.POST("/habits", a.createHabit)
	secure.PATCH("/habits/:id", a.updateHabit)
	secure.DELETE("/habits/:id", a.deleteHabit)
	secure.POST("/habits/:id/complete", a.completeHabit)
	secure.DELETE("/habits/:id/complete", a.undoCompleteHabit)
	secure.POST("/habits/:id/report-miss", a.reportMiss)
	secure.GET("/recoveries", a.active)
	for _, action := range []string{"accept", "micro", "step", "original"} {
		ac := action
		secure.POST("/recoveries/:id/"+ac, func(c *gin.Context) { a.recoveryAction(c, ac) })
	}
	secure.GET("/insights", a.insights)
	secure.GET("/admin/metrics", a.adminMetrics)
	if env("DEMO_MODE", "false") == "true" {
		secure.POST("/demo/seed", a.seedDemo)
	}
	port := env("PORT", "8080")
	log.Printf("Habiton API on :%s", port)
	log.Fatal(r.Run(":" + port))
}
