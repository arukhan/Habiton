package main

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// habitRecoveryLimits returns the number of recovery plans per habit in the
// rolling 30-day window. It is scoped to the authenticated user.
func (a *App) habitRecoveryLimits(c *gin.Context) {
	u, _ := a.current(c)
	rows, err := a.DB.Query(c.Request.Context(), `
        SELECT h.id::text,
               COUNT(r.id)::int
        FROM habits h
        LEFT JOIN recovery_sessions r ON r.habit_id=h.id
            AND r.user_id=$1 AND r.reported_at >= now()-interval '30 days'
        WHERE h.user_id=$1 AND NOT h.archived
        GROUP BY h.id
    `, u.ID)
	if err != nil {
		fail(c, 500, "Could not load recovery limits")
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id string
		var used int
		if err := rows.Scan(&id, &used); err != nil {
			fail(c, 500, "Could not read recovery limits")
			return
		}
		remaining := 3 - used
		if remaining < 0 {
			remaining = 0
		}
		items = append(items, gin.H{"habit_id": id, "used": used, "remaining": remaining, "limit": 3})
	}
	if err := rows.Err(); err != nil {
		fail(c, 500, "Could not read recovery limits")
		return
	}
	c.JSON(200, gin.H{"limits": items})
}

// updateHabit changes future targets without rewriting past logs or active
// recovery quests. Only the owner of the habit can edit it.
func (a *App) updateHabit(c *gin.Context) {
	u, _ := a.current(c)
	var v struct {
		Title         string `json:"title"`
		Category      string `json:"category"`
		TargetMinutes int    `json:"target_minutes"`
	}
	if err := c.ShouldBindJSON(&v); err != nil {
		fail(c, 400, "Invalid habit details")
		return
	}
	v.Title = strings.TrimSpace(v.Title)
	v.Category = strings.TrimSpace(v.Category)
	if len(v.Title) < 2 || len(v.Title) > 100 || len(v.Category) < 1 || len(v.Category) > 32 || v.TargetMinutes < 1 || v.TargetMinutes > 1440 {
		fail(c, 400, "Enter a habit name, category and goal between 1 and 1440 minutes")
		return
	}
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "Database unavailable")
		return
	}
	defer tx.Rollback(ctx)
	var currentID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM habits WHERE id=$1 AND user_id=$2 AND NOT archived FOR UPDATE`, c.Param("id"), u.ID).Scan(&currentID)
	if err != nil {
		fail(c, 404, "Habit not found")
		return
	}
	var active bool
	err = tx.QueryRow(ctx, activeRecoveryQuery, currentID).Scan(&active)
	if err != nil {
		fail(c, 500, "Could not check active recovery")
		return
	}
	if active {
		fail(c, 409, "Finish your active Recovery Flow before editing this habit")
		return
	}
	_, err = tx.Exec(ctx, `UPDATE habits SET title=$3,category=$4,target_minutes=$5 WHERE id=$1 AND user_id=$2`, currentID, u.ID, v.Title, v.Category, v.TargetMinutes)
	if err != nil {
		fail(c, 500, "Could not update habit")
		return
	}
	if err = tx.Commit(ctx); err != nil {
		fail(c, 500, "Could not save habit")
		return
	}
	a.event(ctx, u, "habit_updated", gin.H{"habit_id": currentID, "category": v.Category})
	c.JSON(200, gin.H{"ok": true})
}
