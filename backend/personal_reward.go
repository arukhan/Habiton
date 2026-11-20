package main

import (
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

const personalRewardGoal = 5

const personalRewardProgressSQL = `
	SELECT r.title, LEAST($2::int, count(l.id))::int AS progress
	FROM personal_rewards r
	LEFT JOIN habit_logs l ON l.user_id=r.user_id
		AND l.kind='full' AND l.created_at >= r.started_at
	WHERE r.user_id=$1
	GROUP BY r.user_id, r.title
`

const startPersonalRewardSQL = `
	INSERT INTO personal_rewards (user_id, title) VALUES ($1, $2)
	ON CONFLICT (user_id) DO UPDATE
	SET title=EXCLUDED.title, started_at=clock_timestamp()
	WHERE (
		SELECT count(*) FROM habit_logs l
		WHERE l.user_id=personal_rewards.user_id AND l.kind='full'
			AND l.created_at >= personal_rewards.started_at
	) >= $3::int
	RETURNING title
`

func (a *App) personalReward(c *gin.Context) {
	u, _ := a.current(c)
	var title string
	var progress int
	err := a.DB.QueryRow(c.Request.Context(), personalRewardProgressSQL, u.ID, personalRewardGoal).Scan(&title, &progress)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(200, gin.H{"reward": nil, "goal": personalRewardGoal})
		return
	}
	if err != nil {
		fail(c, 500, "Could not load your reward")
		return
	}
	c.JSON(200, gin.H{"reward": gin.H{"title": title, "progress": progress}, "goal": personalRewardGoal})
}

func (a *App) startPersonalReward(c *gin.Context) {
	u, _ := a.current(c)
	var v struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&v); err != nil {
		fail(c, 400, "Enter a reward name from 1 to 80 characters")
		return
	}
	v.Title = strings.TrimSpace(v.Title)
	if length := utf8.RuneCountInString(v.Title); length < 1 || length > 80 {
		fail(c, 400, "Enter a reward name from 1 to 80 characters")
		return
	}

	var title string
	err := a.DB.QueryRow(c.Request.Context(), startPersonalRewardSQL, u.ID, v.Title, personalRewardGoal).Scan(&title)
	if errors.Is(err, pgx.ErrNoRows) {
		fail(c, 409, "Finish the current reward goal first")
		return
	}
	if err != nil {
		fail(c, 500, "Could not save your reward")
		return
	}
	c.JSON(201, gin.H{"reward": gin.H{"title": title, "progress": 0}, "goal": personalRewardGoal})
}
