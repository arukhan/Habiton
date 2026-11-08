package main

import (
	"context"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"log"
	"os"
	"time"
)

func (a *App) seedDemo(c *gin.Context) {
	if os.Getenv("DEMO_MODE") != "true" {
		fail(c, 404, "Demo mode disabled")
		return
	}
	u, _ := a.current(c)
	ctx := c.Request.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		fail(c, 500, "DB error")
		return
	}
	defer tx.Rollback(ctx)
	var n int
	tx.QueryRow(ctx, `SELECT count(*) FROM habits WHERE user_id=$1`, u.ID).Scan(&n)
	if n > 0 {
		fail(c, 409, "Demo seed works only for a new account without habits")
		return
	}
	id := newID()
	_, err = tx.Exec(ctx, `UPDATE users SET is_demo=true,xp=120 WHERE id=$1`, u.ID)
	if err != nil {
		fail(c, 500, "DB error")
		return
	}
	_, err = tx.Exec(ctx, `INSERT INTO habits(id,user_id,title,category,target_minutes,streak_count,best_streak) VALUES($1,$2,'Study','Study',30,12,12)`, id, u.ID)
	if err != nil {
		fail(c, 500, "DB error")
		return
	}
	for i := 13; i >= 2; i-- {
		d := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		tx.Exec(ctx, `INSERT INTO habit_logs(id,user_id,habit_id,log_date,kind,minutes) VALUES($1,$2,$3,$4::date,'full',30)`, newID(), u.ID, id, d)
	}
	id2 := newID()
	tx.Exec(ctx, `INSERT INTO habits(id,user_id,title,category,target_minutes,streak_count,best_streak) VALUES($1,$2,'Stay hydrated','Health',10,0,0)`, id2, u.ID)
	if _, err = tx.Exec(ctx, `UPDATE analytics_events SET is_demo=true WHERE user_id=$1`, u.ID); err != nil {
		fail(c, 500, "Could not mark demo events")
		return
	}
	if tx.Commit(ctx) != nil {
		fail(c, 500, "DB error")
		return
	}
	c.JSON(200, gin.H{"ok": true, "is_demo": true, "message": "Demonstration-only history added, excluded from real analytics", "habit_id": id})
}

// seedDemoAccounts creates isolated sample identities only in explicit local demo mode.
// Never turn DEMO_MODE on in production; the known sample credentials are public.

func (a *App) seedDemoAccounts(ctx context.Context) error {
	if os.Getenv("DEMO_MODE") != "true" {
		return nil
	}
	password, err := bcrypt.GenerateFromPassword([]byte("HabitonDemo2026!"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	samples := []struct {
		Name, Email, Class string
		XP                 int
	}{
		{"Participant P01", "demo@habiton.local", "Mage", 120},
		{"Maya Reader", "maya@habiton.local", "Mage", 180},
		{"Alex Runner", "alex@habiton.local", "Warrior", 250},
	}
	for _, s := range samples {
		var uid string
		err = a.DB.QueryRow(ctx, `SELECT id::text FROM users WHERE email=$1`, s.Email).Scan(&uid)
		if err == nil {
			continue
		}
		tx, e := a.DB.Begin(ctx)
		if e != nil {
			return e
		}
		uid = newID()
		_, e = tx.Exec(ctx, `INSERT INTO users(id,name,email,password_hash,hero_class,xp,is_demo) VALUES($1,$2,$3,$4,$5,$6,true)`, uid, s.Name, s.Email, string(password), s.Class, s.XP)
		if e != nil {
			tx.Rollback(ctx)
			return e
		}
		habitID := newID()
		title, category, goal := "Study", "Study", 30
		if s.Class == "Warrior" {
			title, category, goal = "Morning movement", "Fitness", 20
		}
		_, e = tx.Exec(ctx, `INSERT INTO habits(id,user_id,title,category,target_minutes,streak_count,best_streak) VALUES($1,$2,$3,$4,$5,12,12)`, habitID, uid, title, category, goal)
		if e != nil {
			tx.Rollback(ctx)
			return e
		}
		// Historical full sessions deliberately stop before yesterday, so a missed-day
		// report can be tested immediately without deleting or falsifying prior work.
		for day := 13; day >= 2; day-- {
			d := time.Now().In(time.FixedZone("Almaty", 5*3600)).AddDate(0, 0, -day).Format("2006-01-02")
			_, e = tx.Exec(ctx, `INSERT INTO habit_logs(id,user_id,habit_id,log_date,kind,minutes) VALUES($1,$2,$3,$4::date,'full',$5)`, newID(), uid, habitID, d, goal)
			if e != nil {
				tx.Rollback(ctx)
				return e
			}
		}
		id2 := newID()
		_, e = tx.Exec(ctx, `INSERT INTO habits(id,user_id,title,category,target_minutes) VALUES($1,$2,'Stay hydrated','Health',10)`, id2, uid)
		if e != nil {
			tx.Rollback(ctx)
			return e
		}
		if e = tx.Commit(ctx); e != nil {
			return e
		}
		log.Printf("Local demo account ready: %s", s.Email)
	}
	return nil
}
