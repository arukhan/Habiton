package main

import (
	"time"

	"github.com/gin-gonic/gin"
)

// HabitDateView is a read-only snapshot. Only /habits/:id/complete can edit today.
type HabitDateView struct {
	ID            string     `json:"id"`
	Title         string     `json:"title"`
	Category      string     `json:"category"`
	TargetMinutes int        `json:"target_minutes"`
	Goal          *HabitGoal `json:"goal,omitempty"`
	Completed     bool       `json:"completed"`
}
type DayView struct {
	Date   string          `json:"date"`
	Habits []HabitDateView `json:"habits"`
}

func currentWeekStart() time.Time {
	loc, err := time.LoadLocation("Asia/Almaty")
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	offset := (int(midnight.Weekday()) + 6) % 7 // Monday = 0
	return midnight.AddDate(0, 0, -offset)
}

// GET /api/habits/week -- Monday to Sunday of the current week.
// Historic rows are never updated by this endpoint.
func (a *App) habitWeek(c *gin.Context) {
	u, _ := a.current(c)
	start := currentWeekStart()
	end := start.AddDate(0, 0, 6)
	days := make([]DayView, 7)
	for i := range days {
		days[i] = DayView{Date: start.AddDate(0, 0, i).Format("2006-01-02"), Habits: []HabitDateView{}}
	}
	// For seeded demo history, the first log may predate habits.created_at.
	// LEAST makes those historical records visible just as in the insights query.
	const query = `
        SELECT d.day::text, h.id::text, h.title, h.category, h.target_minutes,
               COALESCE((SELECT l.goal FROM habit_logs l WHERE l.habit_id=h.id
                         AND l.log_date=d.day AND l.kind='full'), h.goal),
               EXISTS (SELECT 1 FROM habit_logs l
                       WHERE l.habit_id=h.id AND l.user_id=$1
                         AND l.log_date=d.day AND l.kind='full') AS completed
        FROM (SELECT generate_series($2::date::timestamp, $3::date::timestamp, interval '1 day')::date AS day) AS d
        JOIN habits h ON h.user_id=$1 AND NOT h.archived
            AND d.day >= LEAST(
                (h.created_at AT TIME ZONE 'Asia/Almaty')::date,
                COALESCE((SELECT MIN(older.log_date) FROM habit_logs older
                          WHERE older.habit_id=h.id),
                         (h.created_at AT TIME ZONE 'Asia/Almaty')::date)
            )
        ORDER BY d.day, h.created_at DESC, h.id
    `
	rows, err := a.DB.Query(c.Request.Context(), query, u.ID,
		start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		fail(c, 500, "Could not load weekly habits")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var date string
		var h HabitDateView
		if err := rows.Scan(&date, &h.ID, &h.Title, &h.Category,
			&h.TargetMinutes, &h.Goal, &h.Completed); err != nil {
			fail(c, 500, "Could not read weekly habits")
			return
		}
		for i := range days {
			if days[i].Date == date {
				days[i].Habits = append(days[i].Habits, h)
				break
			}
		}
	}
	if rows.Err() != nil {
		fail(c, 500, "Could not load weekly habits")
		return
	}
	c.JSON(200, gin.H{"days": days, "today": localDate()})
}

// GET /api/habits/:id/missed-dates
// Eligible candidates are past days in the last 30 days where the habit
// existed, had no ordinary full completion and no previous recovery report.
// Absence of a log is not proof of a miss; the user confirms it in the form.
func (a *App) missedDates(c *gin.Context) {
	u, _ := a.current(c)
	const query = `
        WITH habit AS (
            SELECT h.id, LEAST(
                (h.created_at AT TIME ZONE 'Asia/Almaty')::date,
                COALESCE((SELECT MIN(l.log_date) FROM habit_logs l WHERE l.habit_id=h.id),
                         (h.created_at AT TIME ZONE 'Asia/Almaty')::date)
            ) AS first_day
            FROM habits h WHERE h.id=$1 AND h.user_id=$2 AND NOT h.archived
        ), dates AS (
            SELECT generate_series(
                ((now() AT TIME ZONE 'Asia/Almaty')::date - 30)::timestamp,
                ((now() AT TIME ZONE 'Asia/Almaty')::date - 1)::timestamp,
                interval '1 day')::date AS day
        )
        SELECT d.day::text
        FROM dates d JOIN habit h ON d.day >= h.first_day
        WHERE NOT EXISTS (SELECT 1 FROM habit_logs l
                          WHERE l.habit_id=h.id AND l.log_date=d.day AND l.kind='full')
          AND NOT EXISTS (SELECT 1 FROM recovery_sessions r
                          WHERE r.habit_id=h.id AND r.missed_date=d.day)
        ORDER BY d.day DESC
    `
	rows, err := a.DB.Query(c.Request.Context(), query, c.Param("id"), u.ID)
	if err != nil {
		fail(c, 500, "Could not load missed dates")
		return
	}
	defer rows.Close()
	dates := []string{}
	for rows.Next() {
		var d string
		if rows.Scan(&d) != nil {
			fail(c, 500, "Could not read missed dates")
			return
		}
		dates = append(dates, d)
	}
	if rows.Err() != nil {
		fail(c, 500, "Could not load missed dates")
		return
	}
	c.JSON(200, gin.H{"dates": dates})
}
