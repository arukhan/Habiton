package main

import (
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func configuredAdminEmail() string {
	return strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
}

func isAdmin(u Identity) bool {
	if u.ID == "" || u.Demo {
		return false
	}
	if adminID := strings.TrimSpace(os.Getenv("ADMIN_USER_ID")); adminID != "" {
		return strings.EqualFold(u.ID, adminID)
	}
	adminEmail := configuredAdminEmail()
	return adminEmail != "" && strings.ToLower(u.Email) == adminEmail
}

const adminWindowSQL = `
	WITH bounds AS (
		SELECT $1::timestamptz AS as_of,
			($1::timestamptz AT TIME ZONE 'Asia/Almaty')::date AS today,
			((($1::timestamptz AT TIME ZONE 'Asia/Almaty')::date - ($2::int - 1))::timestamp
				AT TIME ZONE 'Asia/Almaty') AS starts_at
	)
`

const adminActivitySQL = adminWindowSQL + `
	, activity AS (
		SELECT e.user_id, e.name, (e.created_at AT TIME ZONE 'Asia/Almaty')::date AS day
		FROM analytics_events e
		JOIN users u ON u.id=e.user_id
		CROSS JOIN bounds b
		WHERE NOT u.is_demo AND NOT e.is_demo
			AND e.created_at >= b.starts_at AND e.created_at <= b.as_of
			AND e.name IN ('sign_up_completed','login_completed','habit_created','habit_completed',
				'missed_day_reported','recovery_started','recovery_completed',
				'step_up_completed','full_difficulty_restored')
	)
`

const adminOverviewSQL = adminActivitySQL + `
	, cohort AS (
		SELECT u.id, (u.created_at AT TIME ZONE 'Asia/Almaty')::date + 7 AS return_day
		FROM users u CROSS JOIN bounds b
		WHERE NOT u.is_demo
			AND (u.created_at AT TIME ZONE 'Asia/Almaty')::date + 7 >= (b.starts_at AT TIME ZONE 'Asia/Almaty')::date
			AND (u.created_at AT TIME ZONE 'Asia/Almaty')::date + 7 < b.today
	)
	SELECT
		(SELECT count(*) FROM users WHERE NOT is_demo) AS all_users,
		(SELECT count(*) FROM habits h JOIN users u ON u.id=h.user_id WHERE NOT u.is_demo) AS all_habits,
		(SELECT count(*) FROM recovery_sessions r JOIN users u ON u.id=r.user_id WHERE NOT u.is_demo) AS all_reports,
		(SELECT count(*) FROM users u CROSS JOIN bounds b
			WHERE NOT u.is_demo AND u.created_at >= b.starts_at AND u.created_at <= b.as_of) AS signups,
		(SELECT count(DISTINCT user_id) FROM activity) AS active_users,
		(SELECT count(*) FROM cohort) AS retention_eligible,
		(SELECT count(*) FROM cohort c WHERE EXISTS (
			SELECT 1 FROM activity a WHERE a.user_id=c.id AND a.day=c.return_day
		)) AS retention_returned
`

const adminRecoverySQL = adminWindowSQL + `
	SELECT count(DISTINCT r.user_id) AS offered,
		count(DISTINCT r.user_id) FILTER (WHERE r.accepted_at <= b.as_of) AS accepted,
		count(DISTINCT r.user_id) FILTER (WHERE r.micro_completed_at <= b.as_of) AS completed,
		count(DISTINCT r.user_id) FILTER (WHERE r.original_completed_at <= b.as_of) AS restored,
		count(*) FILTER (WHERE r.streak_before >= 3 AND r.expires_at <= b.as_of) AS matured,
		count(*) FILTER (WHERE r.streak_before >= 3 AND r.expires_at > b.as_of) AS pending,
		count(*) FILTER (WHERE r.streak_before >= 3 AND r.expires_at <= b.as_of
			AND r.micro_completed_at >= r.reported_at AND r.micro_completed_at < r.expires_at) AS recovered
	FROM recovery_sessions r JOIN users u ON u.id=r.user_id CROSS JOIN bounds b
	WHERE NOT u.is_demo AND r.reported_at >= b.starts_at AND r.reported_at <= b.as_of
`

const adminReturnToGoalSQL = adminWindowSQL + `
	SELECT count(*) AS eligible,
		count(*) FILTER (WHERE r.original_completed_at >= r.micro_completed_at
			AND r.original_completed_at <= r.reported_at + interval '168 hours') AS returned
	FROM recovery_sessions r JOIN users u ON u.id=r.user_id CROSS JOIN bounds b
	WHERE NOT u.is_demo AND r.streak_before >= 3
		AND r.reported_at + interval '168 hours' BETWEEN b.starts_at AND b.as_of
		AND r.micro_completed_at >= r.reported_at AND r.micro_completed_at < r.expires_at
`

const adminDailySQL = adminActivitySQL + `
	SELECT d.day::date::text AS day, count(DISTINCT a.user_id) AS active_users,
		count(*) FILTER (WHERE a.name IN ('habit_completed','full_difficulty_restored')) AS completions
	FROM bounds b
	CROSS JOIN LATERAL generate_series((b.starts_at AT TIME ZONE 'Asia/Almaty'),
		b.today::timestamp, interval '1 day') AS d(day)
	LEFT JOIN activity a ON a.day=d.day::date
	GROUP BY d.day
	ORDER BY d.day DESC
`

const adminEventsSQL = adminWindowSQL + `
	SELECT e.name, count(*) AS total
	FROM analytics_events e JOIN users u ON u.id=e.user_id CROSS JOIN bounds b
	WHERE NOT e.is_demo AND NOT u.is_demo AND e.created_at >= b.starts_at AND e.created_at <= b.as_of
	GROUP BY e.name
	ORDER BY total DESC, e.name
`

func (a *App) adminMetrics(c *gin.Context) {
	u, _ := a.current(c)
	if !isAdmin(u) {
		fail(c, 403, "Admin access only")
		return
	}

	days := 30
	switch c.Query("days") {
	case "", "30":
	case "7":
		days = 7
	default:
		fail(c, 400, "Choose a 7-day or 30-day range")
		return
	}

	ctx := c.Request.Context()
	now := time.Now().UTC()
	var users, habits, reports, signups, active, retentionEligible, returned int
	err := a.DB.QueryRow(ctx, adminOverviewSQL, now, days).Scan(
		&users, &habits, &reports, &signups, &active, &retentionEligible, &returned,
	)
	if err != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}

	var offered, accepted, completed, restored, matured, pending, recovered int
	err = a.DB.QueryRow(ctx, adminRecoverySQL, now, days).Scan(
		&offered, &accepted, &completed, &restored, &matured, &pending, &recovered,
	)
	if err != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}

	var returnEligible, returnedToGoal int
	if err := a.DB.QueryRow(ctx, adminReturnToGoalSQL, now, days).Scan(&returnEligible, &returnedToGoal); err != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}

	daily := make([]gin.H, 0, days)
	dailyRows, err := a.DB.Query(ctx, adminDailySQL, now, days)
	if err != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}
	defer dailyRows.Close()
	for dailyRows.Next() {
		var day string
		var activeUsers, completions int
		if err = dailyRows.Scan(&day, &activeUsers, &completions); err != nil {
			fail(c, 500, "Could not load admin metrics")
			return
		}
		daily = append(daily, gin.H{"date": day, "active_users": activeUsers, "completion_actions": completions})
	}
	if dailyRows.Err() != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}

	eventRows, err := a.DB.Query(ctx, adminEventsSQL, now, days)
	if err != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}
	defer eventRows.Close()
	events := []gin.H{}
	for eventRows.Next() {
		var event string
		var count int
		if err = eventRows.Scan(&event, &count); err != nil {
			fail(c, 500, "Could not load admin metrics")
			return
		}
		events = append(events, gin.H{"name": event, "count": count})
	}
	if eventRows.Err() != nil {
		fail(c, 500, "Could not load admin metrics")
		return
	}

	rate := 0.0
	if matured > 0 {
		rate = 100 * float64(recovered) / float64(matured)
	}
	c.JSON(200, gin.H{
		"window_days": days, "updated_at": now, "excluded_demo_accounts": true,
		"real_users": users, "habits_created": habits, "missed_reports": reports,
		"signups": signups, "active_users": active, "daily_activity": daily,
		"eligible_matured": matured, "pending_48h": pending, "recovered_within_48h": recovered,
		"recovery_rate_percent": rate, "retention_7d": gin.H{"eligible": retentionEligible, "returned": returned},
		"return_to_goal_7d": gin.H{"eligible": returnEligible, "returned": returnedToGoal},
		"recovery_funnel":   gin.H{"offered": offered, "accepted": accepted, "completed": completed, "restored": restored},
		"event_counts":      events, "events_last_30_days": events,
	})
}
