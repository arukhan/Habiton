package main

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// The deadline applies until the micro-quest is complete. Later stages stay active.
const activeRecoveryQuery = `
	SELECT EXISTS (
		SELECT 1 FROM recovery_sessions
		WHERE habit_id=$1 AND (
			(status IN ('offered','accepted') AND expires_at>clock_timestamp())
			OR status IN ('micro_completed','step_completed')
		)
	)
`

func clamp(n, min, max int) int {
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}

func template(category, reason string, minutes int) (string, string, string) {
	m := clamp(int(math.Ceil(float64(minutes)/6)), 2, 10)
	step := clamp(int(math.Ceil(float64(minutes)/2)), m+1, minutes)
	if minutes <= 3 {
		m = 1
		step = minutes
	}
	if step > minutes {
		step = minutes
	}
	var micro, stepText string
	switch strings.ToLower(category) {
	case "reading":
		micro = "Read for %d minutes and write one sentence about it."
		stepText = "Read for %d minutes and note one idea."
	case "fitness", "exercise", "health":
		micro = "Move gently for %d minutes at a comfortable pace."
		stepText = "Do %d minutes of comfortable movement."
	case "mindfulness", "rest":
		micro = "Take %d minutes to breathe, reflect, or rest."
		stepText = "Spend %d minutes on a calming routine."
	default:
		micro = "Review your notes for %d minutes and write one key idea."
		stepText = "Study for %d minutes and explain one concept."
	}
	return fmt.Sprintf(micro, m), fmt.Sprintf(stepText, step), "template_" + strings.ToLower(category) + "_" + reason
}

func (a *App) reportMiss(c *gin.Context) {
	u, _ := a.current(c)
	var v struct {
		MissedDate string `json:"missed_date"`
		Reason     string `json:"reason"`
		Workload   string `json:"workload"`
		Energy     int    `json:"energy"`
	}
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid report")
		return
	}
	if v.MissedDate == "" {
		fail(c, 400, "Select a missed date")
		return
	}
	_, err := time.Parse("2006-01-02", v.MissedDate)
	loc, locErr := time.LoadLocation("Asia/Almaty")
	if locErr != nil {
		loc = time.UTC
	}
	oldestDate := time.Now().In(loc).AddDate(0, 0, -30).Format("2006-01-02")
	if err != nil || v.MissedDate >= localDate() || v.MissedDate < oldestDate {
		fail(c, 400, "Choose a past missed date within the last 30 days")
		return
	}
	if v.Reason != "exams" && v.Reason != "fatigue" && v.Reason != "other" {
		fail(c, 400, "Choose a reason")
		return
	}
	v.Energy = clamp(v.Energy, 1, 5)
	if v.Workload == "" {
		v.Workload = "medium"
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Database unavailable")
		return
	}
	defer tx.Rollback(ctx)
	var title, category string
	var minutes, streak, consecutive int
	err = tx.QueryRow(ctx, `SELECT title,category,target_minutes,streak_count,consecutive_recoveries FROM habits WHERE id=$1 AND user_id=$2 AND NOT archived FOR UPDATE`, c.Param("id"), u.ID).Scan(&title, &category, &minutes, &streak, &consecutive)
	if err != nil {
		fail(c, 404, "Habit not found")
		return
	}
	if streak < 3 {
		_, msg := recoveryEligibility(streak, 0, consecutive)
		fail(c, 409, msg)
		return
	}
	var active bool
	if err = tx.QueryRow(ctx, activeRecoveryQuery, c.Param("id")).Scan(&active); err != nil {
		fail(c, 500, "Could not check recovery status")
		return
	}
	if active {
		fail(c, 409, "You already have a recovery plan in progress")
		return
	}
	var validHabitDate bool
	err = tx.QueryRow(ctx, `
        SELECT $2::date >= LEAST(
            (created_at AT TIME ZONE 'Asia/Almaty')::date,
            COALESCE((SELECT MIN(log_date) FROM habit_logs WHERE habit_id=$1),
                     (created_at AT TIME ZONE 'Asia/Almaty')::date))
        FROM habits WHERE id=$1 AND user_id=$3 AND NOT archived
    `, c.Param("id"), v.MissedDate, u.ID).Scan(&validHabitDate)
	if err != nil || !validHabitDate {
		fail(c, 409, "The habit did not exist on that date")
		return
	}
	var alreadyReported bool
	err = tx.QueryRow(ctx, `SELECT EXISTS (
        SELECT 1 FROM recovery_sessions WHERE habit_id=$1 AND missed_date=$2::date
    )`, c.Param("id"), v.MissedDate).Scan(&alreadyReported)
	if err != nil || alreadyReported {
		fail(c, 409, "This day was already reported")
		return
	}
	var exists int
	tx.QueryRow(ctx, `SELECT count(*) FROM habit_logs WHERE habit_id=$1 AND log_date=$2::date AND kind='full'`, c.Param("id"), v.MissedDate).Scan(&exists)
	if exists > 0 {
		fail(c, 409, "You completed this habit on the selected day")
		return
	}
	var count int
	err = tx.QueryRow(ctx, `SELECT count(*) FROM recovery_sessions WHERE habit_id=$1 AND reported_at>=now()-interval '30 days'`, c.Param("id")).Scan(&count)
	if err != nil {
		fail(c, 500, "Could not check recovery limits")
		return
	}
	if ok, msg := recoveryEligibility(streak, count, consecutive); !ok {
		if _, err = tx.Exec(ctx, `UPDATE habits SET streak_count=0 WHERE id=$1`, c.Param("id")); err != nil {
			fail(c, 500, "Could not update streak")
			return
		}
		if err = tx.Commit(ctx); err != nil {
			fail(c, 500, "Could not save streak")
			return
		}
		fail(c, 409, msg)
		return
	}
	micro, stepText, tmpl := template(category, v.Reason, minutes)
	microMinutes := clamp(int(math.Ceil(float64(minutes)/6)), 2, 10)
	if minutes <= 3 {
		microMinutes = 1
	}
	stepMinutes := clamp(int(math.Ceil(float64(minutes)/2)), microMinutes+1, minutes)
	if minutes <= 3 {
		stepMinutes = minutes
	}
	id := newID()
	_, err = tx.Exec(ctx, `INSERT INTO recovery_sessions(id,user_id,habit_id,missed_date,reason,workload,energy,streak_before,micro_minutes,step_minutes,micro_text,step_text,expires_at,template_name) VALUES($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,$12,now()+interval '48 hours',$13)`, id, u.ID, c.Param("id"), v.MissedDate, v.Reason, v.Workload, v.Energy, streak, microMinutes, stepMinutes, micro, stepText, tmpl)
	if err != nil {
		fail(c, 409, "This day has already been reported")
		return
	}
	_, err = tx.Exec(ctx, `INSERT INTO habit_logs(id,user_id,habit_id,log_date,kind) VALUES($1,$2,$3,$4::date,'missed') ON CONFLICT DO NOTHING`, newID(), u.ID, c.Param("id"), v.MissedDate)
	if err != nil {
		fail(c, 500, "Could not save missed day")
		return
	}
	if tx.Commit(ctx) != nil {
		fail(c, 500, "Could not save")
		return
	}
	a.event(ctx, u, "missed_day_reported", gin.H{"habit_id": c.Param("id"), "reason": v.Reason, "recovery_id": id})
	a.event(ctx, u, "recovery_offered", gin.H{"habit_id": c.Param("id"), "recovery_id": id, "template": tmpl})
	c.JSON(201, gin.H{"id": id, "habit_title": title, "status": "offered", "micro_text": micro, "micro_minutes": microMinutes, "step_minutes": stepMinutes, "streak_before": streak, "remaining_windows": 2 - count, "expires_in_hours": 48})
}

func (a *App) active(c *gin.Context) {
	u, _ := a.current(c)
	rows, err := a.DB.Query(c.Request.Context(), `SELECT r.id::text,h.id::text,h.title,h.target_minutes,r.reason,r.status,r.micro_minutes,r.step_minutes,r.micro_text,r.step_text,r.streak_before,r.reported_at,r.expires_at,r.missed_date::text,r.hero_log,(SELECT count(*) FROM recovery_sessions x WHERE x.habit_id=r.habit_id AND x.reported_at>=now()-interval '30 days') FROM recovery_sessions r JOIN habits h ON h.id=r.habit_id WHERE r.user_id=$1 ORDER BY r.reported_at DESC LIMIT 20`, u.ID)
	if err != nil {
		fail(c, 500, "Database error")
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, hid, title, reason, status, micro, step, missed string
		var original, mm, sm, streak, count int
		var reported, expires time.Time
		var hero *string
		if rows.Scan(&id, &hid, &title, &original, &reason, &status, &mm, &sm, &micro, &step, &streak, &reported, &expires, &missed, &hero, &count) != nil {
			continue
		}
		if !time.Now().Before(expires) && (status == "offered" || status == "accepted") {
			status = "expired"
		}
		logText := ""
		if hero != nil {
			logText = *hero
		}
		items = append(items, gin.H{"id": id, "habit_id": hid, "habit_title": title, "original_minutes": original, "reason": reason, "status": status, "micro_minutes": mm, "step_minutes": sm, "micro_text": micro, "step_text": step, "streak_before": streak, "reported_at": reported, "expires_at": expires, "missed_date": missed, "remaining_windows": clamp(3-count, 0, 3), "hero_log": logText})
	}
	c.JSON(200, gin.H{"recoveries": items})
}

func (a *App) recoveryAction(c *gin.Context, action string) {
	u, _ := a.current(c)
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "DB unavailable")
		return
	}
	defer tx.Rollback(ctx)
	// Lock the habit before reading the recovery state, as in reportMiss and completeHabit.
	var habitID string
	var original int
	err = tx.QueryRow(ctx, `
		SELECT h.id::text,h.target_minutes
		FROM recovery_sessions r JOIN habits h ON h.id=r.habit_id
		WHERE r.id=$1 AND r.user_id=$2 AND NOT h.archived
		FOR UPDATE OF h
	`, c.Param("id"), u.ID).Scan(&habitID, &original)
	if err != nil {
		fail(c, 404, "Recovery not found")
		return
	}
	var status string
	var expiry time.Time
	var micro, step int
	err = tx.QueryRow(ctx, `
		SELECT status,expires_at,micro_minutes,step_minutes
		FROM recovery_sessions WHERE id=$1 AND user_id=$2
	`, c.Param("id"), u.ID).Scan(&status, &expiry, &micro, &step)
	if err != nil {
		fail(c, 500, "Could not load recovery state")
		return
	}
	if !time.Now().Before(expiry) && (status == "offered" || status == "accepted") {
		if _, err = tx.Exec(ctx, `UPDATE recovery_sessions SET status='expired' WHERE id=$1`, c.Param("id")); err != nil {
			fail(c, 500, "Could not expire recovery")
			return
		}
		_, err = tx.Exec(ctx, `
			UPDATE habits SET streak_count=0 WHERE id=$1
			AND NOT EXISTS (
				SELECT 1 FROM habit_logs WHERE habit_id=$1 AND kind='full' AND created_at >= $2
			)
			AND NOT EXISTS (
				SELECT 1 FROM recovery_sessions WHERE habit_id=$1 AND reported_at >= $2
			)
		`, habitID, expiry)
		if err != nil {
			fail(c, 500, "Could not update streak")
			return
		}
		if err = tx.Commit(ctx); err != nil {
			fail(c, 500, "Could not save expired recovery")
			return
		}
		fail(c, 409, "Recovery window expired; history and XP were kept")
		return
	}
	type stage struct {
		expected, next, kind, event string
		minutes, xp                 int
	}
	stageByAction := map[string]stage{"accept": {"offered", "accepted", "", "recovery_started", 0, 0}, "micro": {"accepted", "micro_completed", "recovery", "recovery_completed", micro, 10}, "step": {"micro_completed", "step_completed", "step_up", "step_up_completed", step, 10}, "original": {"step_completed", "completed", "full", "full_difficulty_restored", original, 20}}
	s := stageByAction[action]
	if status != s.expected {
		fail(c, 409, "Complete the previous step first")
		return
	}
	xpAwarded := 0
	if action != "accept" {
		var v struct {
			Confirmed bool
			Notes     []string
		}
		if c.ShouldBindJSON(&v) != nil || !v.Confirmed {
			fail(c, 400, "Confirm that you completed the task")
			return
		}
		if len(v.Notes) > 3 {
			fail(c, 400, "Up to three notes allowed")
			return
		}
		data, _ := json.Marshal(v.Notes)
		log, err := tx.Exec(ctx, `INSERT INTO habit_logs(id,user_id,habit_id,log_date,kind,minutes,notes) VALUES($1,$2,$3,$4::date,$5,$6,$7) ON CONFLICT(habit_id,log_date,kind) DO NOTHING`, newID(), u.ID, habitID, localDate(), s.kind, s.minutes, data)
		if err != nil {
			fail(c, 500, "Could not save the check-in")
			return
		}
		if log.RowsAffected() > 0 {
			if _, err := tx.Exec(ctx, `UPDATE users SET xp=xp+$2 WHERE id=$1`, u.ID, s.xp); err != nil {
				fail(c, 500, "Could not update XP")
				return
			}
			xpAwarded = s.xp
		}
	}
	field := "accepted_at"
	if action == "micro" {
		field = "micro_completed_at"
	}
	if action == "step" {
		field = "step_completed_at"
	}
	if action == "original" {
		field = "original_completed_at"
	}
	hero := ""
	if action == "micro" {
		hero = "I returned, one small step at a time. Tomorrow I can try a little more."
	}
	if action == "step" {
		hero = "A little more focus today. My original goal is in reach."
	}
	if action == "original" {
		hero = "I came back at my own pace. The small steps counted."
	}
	_, err = tx.Exec(ctx, `UPDATE recovery_sessions SET status=$2,`+field+`=now(),hero_log=CASE WHEN $3='' THEN hero_log ELSE $3 END WHERE id=$1`, c.Param("id"), s.next, hero)
	if err != nil {
		fail(c, 500, "Could not save step")
		return
	}
	if action == "micro" {
		_, err = tx.Exec(ctx, `UPDATE habits SET consecutive_recoveries=consecutive_recoveries+1 WHERE id=$1`, habitID)
	}
	if action == "original" {
		increment := 0
		if xpAwarded > 0 {
			increment = 1
		}
		_, err = tx.Exec(ctx, `UPDATE habits SET streak_count=streak_count+$2,best_streak=GREATEST(best_streak,streak_count+$2),consecutive_recoveries=0 WHERE id=$1`, habitID, increment)
	}
	if err != nil {
		fail(c, 500, "Could not save progress")
		return
	}
	if tx.Commit(ctx) != nil {
		fail(c, 500, "Commit failed")
		return
	}
	a.event(ctx, u, s.event, gin.H{"recovery_id": c.Param("id"), "habit_id": habitID, "xp_awarded": xpAwarded, "minutes": s.minutes})
	c.JSON(200, gin.H{"ok": true, "status": s.next, "xp_awarded": xpAwarded, "hero_log": hero})
}
