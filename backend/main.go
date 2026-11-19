package main

import (
	"context"
	"embed"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

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
	sql, err := migrationFS.ReadFile("migrations/001_init.sql")
	if err != nil {
		log.Fatal(err)
	}
	for _, statement := range strings.Split(string(sql), ";") {
		if strings.TrimSpace(statement) == "" {
			continue
		}
		if _, err = db.Exec(context.Background(), statement); err != nil {
			log.Fatalf("Schema init failed: %v", err)
		}
	}
	a := &App{DB: db, Client: &http.Client{Timeout: 5 * time.Second}, AmplitudeKey: os.Getenv("AMPLITUDE_API_KEY")}
	if env("DEMO_MODE", "false") == "true" {
		if err = a.seedDemoAccounts(context.Background()); err != nil {
			log.Fatalf("Demo seed failed: %v", err)
		}
	}
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

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

		c.Next()
	})

	r.GET("/api/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok", "service": "habiton-backend"}) })
	r.POST("/api/auth/register", a.register)
	r.POST("/api/auth/login", a.login)
	secure := r.Group("/api")
	secure.Use(a.auth())
	secure.POST("/auth/logout", a.logout)
	secure.GET("/me", a.me)
	secure.PATCH("/me", a.updateMe)
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
