package main

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func (a *App) habits(c *gin.Context) {
	u, _ := a.current(c)
	if err := a.reconcileExpiredRecoveries(c.Request.Context(), u.ID); err != nil {
		fail(c, 500, "Could not update expired recoveries")
		return
	}
	rows, err := a.DB.Query(c.Request.Context(), `SELECT h.id::text,h.title,h.category,h.target_minutes,h.goal,h.streak_count,h.best_streak, h.consecutive_recoveries, EXISTS(SELECT 1 FROM habit_logs l WHERE l.habit_id=h.id AND l.log_date=$2::date AND l.kind='full') FROM habits h WHERE h.user_id=$1 AND NOT h.archived ORDER BY h.created_at DESC`, u.ID, localDate())
	if err != nil {
		fail(c, 500, "Database error")
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, title, category string
		var minutes, streak, best, consecutive int
		var done bool
		var goal *HabitGoal
		if rows.Scan(&id, &title, &category, &minutes, &goal, &streak, &best, &consecutive, &done) == nil {
			items = append(items, gin.H{"id": id, "title": title, "category": category, "target_minutes": minutes, "goal": resolveGoal(goal, minutes), "streak": streak, "best_streak": best, "consecutive_recoveries": consecutive, "completed_today": done})
		}
	}
	c.JSON(200, gin.H{"habits": items})
}

func (a *App) createHabit(c *gin.Context) {
	u, _ := a.current(c)
	var v habitInput
	if c.ShouldBindJSON(&v) != nil {
		fail(c, 400, "Invalid habit")
		return
	}
	v.Title = strings.TrimSpace(v.Title)
	if len(v.Title) < 2 || len(v.Title) > 100 || !v.normalizeGoal() {
		fail(c, 400, "Enter a valid habit name and goal")
		return
	}
	if v.Category == "" {
		v.Category = "Study"
	}
	if len(v.Category) > 32 {
		fail(c, 400, "Invalid category")
		return
	}
	id := newID()
	_, err := a.DB.Exec(c.Request.Context(), `INSERT INTO habits(id,user_id,title,category,target_minutes,goal) VALUES($1,$2,$3,$4,$5,$6)`, id, u.ID, v.Title, v.Category, v.TargetMinutes, v.Goal)
	if err != nil {
		fail(c, 500, "Cannot save habit")
		return
	}
	a.event(c.Request.Context(), u, "habit_created", gin.H{"habit_id": id, "category": v.Category, "goal_type": v.Goal.Type})
	c.JSON(201, gin.H{"id": id, "title": v.Title, "category": v.Category, "target_minutes": v.TargetMinutes, "goal": v.Goal, "streak": 0})
}

func (a *App) deleteHabit(c *gin.Context) {
	u, _ := a.current(c)
	cmd, err := a.DB.Exec(c.Request.Context(), `UPDATE habits SET archived=true, archived_at=COALESCE(archived_at,now()) WHERE id=$1 AND user_id=$2`, c.Param("id"), u.ID)
	if err != nil || cmd.RowsAffected() == 0 {
		fail(c, 404, "Habit not found")
		return
	}
	c.JSON(200, gin.H{"ok": true})
}

func (a *App) completeHabit(c *gin.Context) {
	u, _ := a.current(c)
	if err := a.reconcileExpiredRecoveries(c.Request.Context(), u.ID); err != nil {
		fail(c, 500, "Could not update expired recoveries")
		return
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Database unavailable")
		return
	}
	defer tx.Rollback(ctx)
	var streak, targetMinutes int
	var storedGoal *HabitGoal
	err = tx.QueryRow(ctx, `SELECT streak_count, target_minutes, goal FROM habits WHERE id=$1 AND user_id=$2 AND NOT archived FOR UPDATE`, c.Param("id"), u.ID).Scan(&streak, &targetMinutes, &storedGoal)
	if err != nil {
		fail(c, 404, "Habit not found")
		return
	}
	today := localDate()
	var existing int
	err = tx.QueryRow(ctx, `SELECT count(*) FROM habit_logs WHERE habit_id=$1 AND log_date=$2::date AND kind='full'`, c.Param("id"), today).Scan(&existing)
	if err != nil || existing > 0 {
		fail(c, 409, "Already completed today")
		return
	}
	var active bool
	if err = tx.QueryRow(ctx, activeRecoveryQuery, c.Param("id")).Scan(&active); err != nil {
		fail(c, 500, "Could not check recovery status")
		return
	}
	if active {
		fail(c, 409, "Finish your active recovery plan first")
		return
	}
	var completedYesterday bool
	err = tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM habit_logs
			WHERE habit_id=$1 AND log_date=$2::date - 1 AND kind='full'
		)
	`, c.Param("id"), today).Scan(&completedYesterday)
	if err != nil {
		fail(c, 500, "Could not check the previous day")
		return
	}
	nextStreak := 1
	if completedYesterday {
		nextStreak = streak + 1
	}

	goal := resolveGoal(storedGoal, targetMinutes)
	goal.MicroQuest = ""
	_, err = tx.Exec(ctx, `INSERT INTO habit_logs(id,user_id,habit_id,log_date,kind,minutes,goal) VALUES($1,$2,$3,$4::date,'full',$5,$6)`, newID(), u.ID, c.Param("id"), today, goal.minutes(), goal)
	if err != nil {
		fail(c, 500, "Could not record completion")
		return
	}
	_, err = tx.Exec(ctx, `UPDATE habits SET streak_count=$2,best_streak=GREATEST(best_streak,$2),consecutive_recoveries=0 WHERE id=$1`, c.Param("id"), nextStreak)
	if err != nil {
		fail(c, 500, "Could not update streak")
		return
	}
	_, err = tx.Exec(ctx, `UPDATE users SET xp=xp+20 WHERE id=$1`, u.ID)
	if err != nil {
		fail(c, 500, "Could not update XP")
		return
	}
	if tx.Commit(ctx) != nil {
		fail(c, 500, "Could not save")
		return
	}
	a.event(ctx, u, "habit_completed", gin.H{"habit_id": c.Param("id"), "goal_type": goal.Type, "xp_awarded": 20})
	c.JSON(200, gin.H{"ok": true, "streak": nextStreak, "xp_awarded": 20})
}

func (a *App) undoCompleteHabit(c *gin.Context) {
	u, _ := a.current(c)
	ctx := c.Request.Context()
	habitID := c.Param("id")
	today := localDate()

	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Database unavailable")
		return
	}
	defer tx.Rollback(ctx)

	var streak int
	err = tx.QueryRow(ctx, `
        SELECT streak_count
        FROM habits
        WHERE id=$1 AND user_id=$2 AND NOT archived
        FOR UPDATE
    `, habitID, u.ID).Scan(&streak)

	if err != nil {
		fail(c, 404, "Habit not found")
		return
	}

	// Completed recovery sessions have their own rules.
	// Do not reverse them through the ordinary checkbox.
	var recoveryCompletion bool
	err = tx.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM recovery_sessions
            WHERE habit_id=$1
              AND user_id=$2
              AND status='completed'
              AND (original_completed_at
                   AT TIME ZONE 'Asia/Almaty')::date
                  = $3::date
        )
    `, habitID, u.ID, today).Scan(&recoveryCompletion)

	if err != nil {
		fail(c, 500, "Could not verify completion")
		return
	}

	if recoveryCompletion {
		fail(c, 409, "Recovery completion cannot be undone here")
		return
	}

	// Remove today's ordinary completion and retain its original goal type for analytics.
	var goalType string
	err = tx.QueryRow(ctx, `
        DELETE FROM habit_logs
        WHERE habit_id=$1
          AND user_id=$2
          AND log_date=$3::date
          AND kind='full'
        RETURNING COALESCE(goal->>'type', 'minutes')
    `, habitID, u.ID, today).Scan(&goalType)

	if err == pgx.ErrNoRows {
		fail(c, 409, "No completion to undo today")
		return
	}
	if err != nil {
		fail(c, 500, "Could not undo completion")
		return
	}

	// Reverse the current streak increment.
	_, err = tx.Exec(ctx, `
        UPDATE habits
        SET streak_count=GREATEST(0,streak_count-1)
        WHERE id=$1 AND user_id=$2
    `, habitID, u.ID)

	if err != nil {
		fail(c, 500, "Could not update streak")
		return
	}

	// Reverse the 20 XP reward.
	_, err = tx.Exec(ctx, `
        UPDATE users
        SET xp=GREATEST(0,xp-20)
        WHERE id=$1
    `, u.ID)

	if err != nil {
		fail(c, 500, "Could not update XP")
		return
	}

	if err = tx.Commit(ctx); err != nil {
		fail(c, 500, "Could not save changes")
		return
	}

	a.event(ctx, u, "habit_completion_undone", gin.H{
		"habit_id":    habitID,
		"xp_reversed": 20,
		"goal_type":   goalType,
	})

	c.JSON(200, gin.H{
		"ok":              true,
		"completed_today": false,
		"streak":          max(0, streak-1),
		"xp_reversed":     20,
	})
}
