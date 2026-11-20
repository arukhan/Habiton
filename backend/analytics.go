package main

import "github.com/gin-gonic/gin"

func (a *App) insights(c *gin.Context) {
	u, _ := a.current(c)
	var total, full, recovery, step, best int
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*),COALESCE(SUM(streak_count),0),COALESCE(MAX(best_streak),0) FROM habits WHERE user_id=$1 AND NOT archived`, u.ID).Scan(&total, &full, &best)
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM habit_logs WHERE user_id=$1 AND kind='full'`, u.ID).Scan(&full)
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM habit_logs WHERE user_id=$1 AND kind='recovery'`, u.ID).Scan(&recovery)
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM habit_logs WHERE user_id=$1 AND kind='step_up'`, u.ID).Scan(&step)
	var threeDays bool
	const streakAchievementSQL = `
		SELECT EXISTS (
			SELECT 1 FROM habit_logs current_log
			JOIN habit_logs previous_day ON previous_day.habit_id=current_log.habit_id
				AND previous_day.log_date=current_log.log_date-1 AND previous_day.kind='full'
			JOIN habit_logs two_days_ago ON two_days_ago.habit_id=current_log.habit_id
				AND two_days_ago.log_date=current_log.log_date-2 AND two_days_ago.kind='full'
			WHERE current_log.user_id=$1 AND current_log.kind='full'
		)
	`
	if err := a.DB.QueryRow(c.Request.Context(), streakAchievementSQL, u.ID).Scan(&threeDays); err != nil {
		fail(c, 500, "Could not load achievements")
		return
	}
	rows, err := a.DB.Query(c.Request.Context(), `SELECT l.log_date::text,l.kind,CASE WHEN l.kind='full' AND l.minutes=0 THEN h.target_minutes ELSE l.minutes END,h.title FROM habit_logs l JOIN habits h ON h.id=l.habit_id WHERE l.user_id=$1 ORDER BY l.log_date DESC,l.created_at DESC LIMIT 35`, u.ID)
	items := []gin.H{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var date, kind, title string
			var minutes int
			if rows.Scan(&date, &kind, &minutes, &title) == nil {
				items = append(items, gin.H{"date": date, "kind": kind, "minutes": minutes, "habit_title": title})
			}
		}
	}
	// One bar = one calendar day in Asia/Almaty, not one habit log.
	// A full habit_log means that ONE habit was completed; 100% requires all
	// habits scheduled for that day to have a full log.
	// For seeded sample history only, the earliest stored log can precede
	// habits.created_at. LEAST() makes these historical demonstrations visible.
	// Retain archived habits on past days and on the archive day if completed.
	const dailySQL = `
		WITH days AS (
			SELECT generate_series(
				((now() AT TIME ZONE 'Asia/Almaty')::date - 13)::timestamp,
				((now() AT TIME ZONE 'Asia/Almaty')::date)::timestamp,
				interval '1 day'
			)::date AS day
		)
		SELECT d.day::text,
			COUNT(DISTINCT h.id) FILTER (
				WHERE NOT h.archived OR d.day < (h.archived_at AT TIME ZONE 'Asia/Almaty')::date
				OR (d.day = (h.archived_at AT TIME ZONE 'Asia/Almaty')::date AND l.habit_id IS NOT NULL)
			)::int AS total_habits,
			COUNT(DISTINCT l.habit_id) FILTER (
				WHERE NOT h.archived OR d.day <= (h.archived_at AT TIME ZONE 'Asia/Almaty')::date
			)::int AS completed_habits
		FROM days d
		LEFT JOIN habits h ON h.user_id=$1
			AND d.day >= LEAST(
				(h.created_at AT TIME ZONE 'Asia/Almaty')::date,
				COALESCE((SELECT MIN(older.log_date)
					FROM habit_logs older WHERE older.habit_id=h.id),
					(h.created_at AT TIME ZONE 'Asia/Almaty')::date)
			)
		LEFT JOIN habit_logs l ON l.habit_id=h.id
			AND l.user_id=$1 AND l.log_date=d.day AND l.kind='full'
		GROUP BY d.day
		ORDER BY d.day
	`
	dailyRows, err := a.DB.Query(c.Request.Context(), dailySQL, u.ID)
	if err != nil {
		fail(c, 500, "Could not load daily progress")
		return
	}
	daily := []gin.H{}
	perfectDays := 0
	for dailyRows.Next() {
		var date string
		var totalDay, completedDay int
		if err := dailyRows.Scan(&date, &totalDay, &completedDay); err != nil {
			dailyRows.Close()
			fail(c, 500, "Could not read daily progress")
			return
		}
		percentage := 0
		if totalDay > 0 {
			percentage = (completedDay*100 + totalDay/2) / totalDay
			if completedDay == totalDay {
				perfectDays++
			}
		}
		daily = append(daily, gin.H{
			"date": date, "total_habits": totalDay,
			"completed_habits": completedDay, "percentage": percentage,
		})
	}
	if err := dailyRows.Err(); err != nil {
		dailyRows.Close()
		fail(c, 500, "Could not load daily progress")
		return
	}
	dailyRows.Close()

	c.JSON(200, gin.H{
		"total_habits": total, "full_sessions": full,
		"recoveries": recovery, "step_ups": step,
		"best_streak": best, "history": items,
		"daily_completion": daily, "perfect_days": perfectDays,
		"achievements": gin.H{"first_step": full > 0, "three_days": threeDays, "comeback": recovery > 0},
	})
}
