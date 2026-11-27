package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func integrationDB(t *testing.T) (context.Context, *pgxpool.Pool) {
	t.Helper()
	dsn := os.Getenv("HABITON_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set HABITON_TEST_DATABASE_URL to run the PostgreSQL integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal("invalid test database configuration")
	}
	admin, err := pgxpool.NewWithConfig(ctx, config.Copy())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(admin.Close)
	schema := "habiton_test_" + strings.ReplaceAll(newID(), "-", "")
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, err := admin.Exec(cleanup, "DROP SCHEMA "+schema+" CASCADE"); err != nil {
			t.Error(err)
		}
	})
	config.ConnConfig.RuntimeParams["search_path"] = schema
	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)

	migrations, err := migrationFS.ReadDir("migrations")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range migrations {
		sql, err := migrationFS.ReadFile("migrations/" + file.Name())
		if err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, string(sql)); err != nil {
			t.Fatal(err)
		}
	}
	return ctx, db
}

func TestRecoveryPostgres(t *testing.T) {
	ctx, db := integrationDB(t)

	exec := func(query string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, query, args...); err != nil {
			t.Fatal(err)
		}
	}

	user := Identity{ID: newID()}
	exec("INSERT INTO users (id,name,email,password_hash,xp) VALUES ($1,'Student','test@example.test','unused',100)", user.ID)
	createHabit := func() string {
		id := newID()
		exec(`INSERT INTO habits (id,user_id,title,target_minutes,streak_count,best_streak,created_at)
			VALUES ($1,$2,'Study',30,12,12,now()-interval '15 days')`, id, user.ID)
		return id
	}

	app := &App{DB: db}
	router := gin.New()
	router.Use(func(c *gin.Context) { c.Set("user", user) })
	router.GET("/habits", app.habits)
	router.POST("/habits", app.createHabit)
	router.PATCH("/habits/:id", app.updateHabit)
	router.POST("/habits/:id/complete", app.completeHabit)
	router.DELETE("/habits/:id/complete", app.undoCompleteHabit)
	router.POST("/habits/:id/report-miss", app.reportMiss)
	router.POST("/recoveries/:id/:action", func(c *gin.Context) { app.recoveryAction(c, c.Param("action")) })
	call := func(method, path, body string, expected int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body)).WithContext(ctx)
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		if res.Code != expected {
			t.Fatalf("%s %s: got %d, want %d (%s)", method, path, res.Code, expected, res.Body)
		}
		return res
	}

	expiredHabit := createHabit()
	currentHabit := createHabit()
	expiredPlan := newID()
	exec(`INSERT INTO recovery_sessions (id,user_id,habit_id,missed_date,reason,
		streak_before,micro_minutes,step_minutes,micro_text,step_text,reported_at,expires_at,template_name)
		VALUES ($1,$2,$3,current_date-4,'fatigue',12,5,15,'micro','step',
			now()-interval '3 days',now()-interval '1 day','study')`, expiredPlan, user.ID, expiredHabit)
	call(http.MethodGet, "/habits", "", 200)
	call(http.MethodPost, "/recoveries/"+expiredPlan+"/micro", `{"confirmed":true}`, 409)
	var status string
	var streak, best int
	err := db.QueryRow(ctx, `SELECT r.status,h.streak_count,h.best_streak FROM recovery_sessions r JOIN habits h
		ON h.id=r.habit_id WHERE r.id=$1`, expiredPlan).Scan(&status, &streak, &best)
	if err != nil || status != "expired" || streak != 0 || best != 12 {
		t.Fatalf("expired recovery: status=%q streak=%d best=%d err=%v", status, streak, best, err)
	}

	today, err := time.Parse(time.DateOnly, localDate())
	if err != nil {
		t.Fatal(err)
	}
	reportBody, err := json.Marshal(map[string]string{"missed_date": today.AddDate(0, 0, -1).Format(time.DateOnly), "reason": "fatigue"})
	if err != nil {
		t.Fatal(err)
	}
	reportPath := "/habits/" + currentHabit + "/report-miss"
	res := call(http.MethodPost, reportPath, string(reportBody), 201)
	var plan struct{ ID string }
	if err := json.Unmarshal(res.Body.Bytes(), &plan); err != nil || plan.ID == "" {
		t.Fatalf("invalid recovery response: %s", res.Body)
	}
	call(http.MethodPost, reportPath, string(reportBody), 409)
	for _, step := range []string{"accept", "micro", "step", "original"} {
		path := "/recoveries/" + plan.ID + "/" + step
		call(http.MethodPost, path, `{"confirmed":true}`, 200)
		call(http.MethodPost, path, `{"confirmed":true}`, 409)
	}
	var xp int
	err = db.QueryRow(ctx, `SELECT r.status,h.streak_count,u.xp FROM recovery_sessions r JOIN habits h
		ON h.id=r.habit_id JOIN users u ON u.id=h.user_id WHERE r.id=$1`, plan.ID).Scan(&status, &streak, &xp)
	if err != nil || status != "completed" || streak != 13 || xp != 140 {
		t.Fatalf("completed recovery: status=%q streak=%d xp=%d err=%v", status, streak, xp, err)
	}

	var eligible7d, returned7d int
	readMetrics := func(asOf time.Time) {
		t.Helper()
		if err := db.QueryRow(ctx, adminReturnToGoalSQL, asOf, 7).Scan(&eligible7d, &returned7d); err != nil {
			t.Fatal(err)
		}
	}
	readMetrics(time.Now().UTC())
	if eligible7d != 0 || returned7d != 0 {
		t.Fatalf("open G1 window counted: eligible=%d returned=%d", eligible7d, returned7d)
	}
	asOf := time.Now().UTC().Add(9 * 24 * time.Hour)
	readMetrics(asOf)
	if eligible7d != 1 || returned7d != 1 {
		t.Fatalf("closed G1 window: eligible=%d returned=%d", eligible7d, returned7d)
	}
	exec("UPDATE recovery_sessions SET original_completed_at=reported_at+interval '169 hours' WHERE id=$1", plan.ID)
	readMetrics(asOf)
	if eligible7d != 1 || returned7d != 0 {
		t.Fatalf("late G1 return counted: eligible=%d returned=%d", eligible7d, returned7d)
	}
	t.Run("typed goals and recovery history", func(t *testing.T) {
		var habit struct {
			ID   string
			Goal HabitGoal
		}
		path := "/habits"
		res := call(http.MethodPost, path, `{"title":"Daily squats","category":"Fitness","goal":{"type":"repetitions","amount":10,"unit":"squats"}}`, 201)
		if err := json.Unmarshal(res.Body.Bytes(), &habit); err != nil || habit.Goal.Type != "repetitions" || habit.Goal.Amount != 10 {
			t.Fatalf("invalid repetition goal response: %s", res.Body)
		}
		path += "/" + habit.ID
		exec(`UPDATE habits SET streak_count=12, best_streak=12, created_at=now()-interval '15 days' WHERE id=$1`, habit.ID)
		res = call(http.MethodPost, path+"/report-miss", string(reportBody), 201)
		var recovery struct {
			ID    string
			Goals RecoveryGoals
		}
		if err := json.Unmarshal(res.Body.Bytes(), &recovery); err != nil || recovery.Goals.Micro.Amount != 3 || recovery.Goals.Step.Amount != 5 {
			t.Fatalf("invalid repetition recovery response: %s", res.Body)
		}
		for _, step := range []string{"accept", "micro", "step", "original"} {
			call(http.MethodPost, "/recoveries/"+recovery.ID+"/"+step, `{"confirmed":true}`, 200)
		}
		call(http.MethodPatch, path, `{"title":"Prepare my bag","category":"Other","goal":{"type":"action","micro_quest":"Put in one notebook."}}`, 200)
		var count, minutes int
		var goalType string
		if err := db.QueryRow(ctx, `SELECT goal->>'type', (goal->>'amount')::int, minutes FROM habit_logs WHERE habit_id=$1 AND kind='full'`, habit.ID).
			Scan(&goalType, &count, &minutes); err != nil || goalType != "repetitions" || count != 10 || minutes != 0 {
			t.Fatalf("historic goal changed: %s %d, minutes=%d, err=%v", goalType, count, minutes, err)
		}

		habit.Goal = HabitGoal{}
		res = call(http.MethodPost, "/habits", `{"title":"Prepare my bag","category":"Other","goal":{"type":"action"}}`, 201)
		if err := json.Unmarshal(res.Body.Bytes(), &habit); err != nil || habit.Goal.Type != "action" {
			t.Fatalf("invalid action goal response: %s", res.Body)
		}
		path = "/habits/" + habit.ID + "/complete"
		call(http.MethodPost, path, "", 200)
		call(http.MethodPost, path, "", 409)
		call(http.MethodDelete, path, "", 200)
		call(http.MethodDelete, path, "", 409)
	})

}
