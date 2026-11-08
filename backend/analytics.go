package main

import (
	"github.com/gin-gonic/gin"
	"os"
	"strings"
)

func (a *App) insights(c *gin.Context) {
	u, _ := a.current(c)
	var total, full, recovery, step, best int
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*),COALESCE(SUM(streak_count),0),COALESCE(MAX(best_streak),0) FROM habits WHERE user_id=$1 AND NOT archived`, u.ID).Scan(&total, &full, &best)
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM habit_logs WHERE user_id=$1 AND kind='full'`, u.ID).Scan(&full)
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM habit_logs WHERE user_id=$1 AND kind='recovery'`, u.ID).Scan(&recovery)
	a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM habit_logs WHERE user_id=$1 AND kind='step_up'`, u.ID).Scan(&step)
	rows, err := a.DB.Query(c.Request.Context(), `SELECT l.log_date::text,l.kind,l.minutes,h.title FROM habit_logs l JOIN habits h ON h.id=l.habit_id WHERE l.user_id=$1 ORDER BY l.log_date DESC,l.created_at DESC LIMIT 35`, u.ID)
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
	c.JSON(200, gin.H{"total_habits": total, "full_sessions": full, "recoveries": recovery, "step_ups": step, "best_streak": best, "history": items})
}

func (a *App) adminMetrics(c *gin.Context) {
	u, _ := a.current(c)
	if strings.ToLower(u.Email) != strings.ToLower(os.Getenv("ADMIN_EMAIL")) || os.Getenv("ADMIN_EMAIL") == "" {
		fail(c, 403, "Admin access only")
		return
	}
	var users, habits, misses, recovered, eligible int
	ctx := c.Request.Context()
	a.DB.QueryRow(ctx, `SELECT count(*) FROM users WHERE NOT is_demo`).Scan(&users)
	a.DB.QueryRow(ctx, `SELECT count(*) FROM habits h JOIN users u ON h.user_id=u.id WHERE NOT u.is_demo`).Scan(&habits)
	a.DB.QueryRow(ctx, `SELECT count(*) FROM recovery_sessions r JOIN users u ON r.user_id=u.id WHERE NOT u.is_demo`).Scan(&misses)
	a.DB.QueryRow(ctx, `SELECT count(*) FROM recovery_sessions r JOIN users u ON r.user_id=u.id WHERE NOT u.is_demo AND r.streak_before>=3 AND r.reported_at<=now()-interval '48 hours'`).Scan(&eligible)
	a.DB.QueryRow(ctx, `SELECT count(*) FROM recovery_sessions r JOIN users u ON r.user_id=u.id WHERE NOT u.is_demo AND r.streak_before>=3 AND r.reported_at<=now()-interval '48 hours' AND r.micro_completed_at IS NOT NULL AND r.micro_completed_at<=r.reported_at+interval '48 hours'`).Scan(&recovered)
	rate := 0.0
	if eligible > 0 {
		rate = 100 * float64(recovered) / float64(eligible)
	}
	rows, err := a.DB.Query(ctx, `SELECT name,count(*) FROM analytics_events WHERE NOT is_demo AND created_at>now()-interval '30 days' GROUP BY name ORDER BY count(*) DESC`)
	events := []gin.H{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			var n int
			if rows.Scan(&name, &n) == nil {
				events = append(events, gin.H{"name": name, "count": n})
			}
		}
	}
	c.JSON(200, gin.H{"real_users": users, "habits_created": habits, "missed_reports": misses, "eligible_matured": eligible, "recovered_within_48h": recovered, "recovery_rate_percent": rate, "events_last_30_days": events, "excluded_demo_accounts": true})
}
