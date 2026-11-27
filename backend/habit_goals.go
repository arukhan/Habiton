package main

import (
	"strings"
	"unicode/utf8"
)

type HabitGoal struct {
	Type       string `json:"type"`
	Amount     int    `json:"amount,omitempty"`
	Unit       string `json:"unit,omitempty"`
	MicroQuest string `json:"micro_quest,omitempty"`
}

type habitInput struct {
	Title         string     `json:"title"`
	Category      string     `json:"category"`
	TargetMinutes int        `json:"target_minutes"`
	Goal          *HabitGoal `json:"goal"`
}

func minuteGoal(minutes int) HabitGoal {
	return HabitGoal{Type: "minutes", Amount: minutes}
}

func resolveGoal(goal *HabitGoal, minutes int) HabitGoal {
	if goal != nil {
		return *goal
	}
	return minuteGoal(minutes)
}

func (g HabitGoal) minutes() int {
	if g.Type == "minutes" {
		return g.Amount
	}
	return 0
}

func (g HabitGoal) valid() bool {
	if utf8.RuneCountInString(g.MicroQuest) > 160 || strings.ContainsAny(g.MicroQuest, "\r\n") {
		return false
	}
	switch g.Type {
	case "minutes":
		return g.Amount >= 1 && g.Amount <= 1440 && g.Unit == ""
	case "repetitions":
		return g.Amount >= 1 && g.Amount <= 10000 && utf8.RuneCountInString(g.Unit) <= 32 && !strings.ContainsAny(g.Unit, "\r\n")
	case "action":
		return g.Amount == 0 && g.Unit == ""
	default:
		return false
	}
}

func (v *habitInput) normalizeGoal() bool {
	goal := resolveGoal(v.Goal, v.TargetMinutes)
	goal.Unit = strings.TrimSpace(goal.Unit)
	goal.MicroQuest = strings.TrimSpace(goal.MicroQuest)
	if !goal.valid() {
		return false
	}
	v.Goal = &goal
	// The legacy column is constrained to positive minutes. Only typed minute
	// goals use this column as a duration in the current app.
	v.TargetMinutes = max(1, goal.minutes())
	return true
}

type RecoveryGoals struct {
	Original HabitGoal `json:"original"`
	Micro    HabitGoal `json:"micro"`
	Step     HabitGoal `json:"step"`
}

func resolveRecoveryGoals(goals *RecoveryGoals, original, micro, step int) RecoveryGoals {
	if goals != nil {
		return *goals
	}
	return RecoveryGoals{Original: minuteGoal(original), Micro: minuteGoal(micro), Step: minuteGoal(step)}
}

func recoveryPlan(goal HabitGoal, category, reason string) (RecoveryGoals, string, string, string) {
	original := goal
	original.MicroQuest = ""
	action := HabitGoal{Type: "action"}
	plan := RecoveryGoals{Original: original, Micro: action, Step: action}
	micro, step := "Prepare one item you need for this habit.", "Try the first part of your habit."
	templateName := "action"
	if strings.EqualFold(category, "Reading") {
		micro, step = "Read one paragraph.", "Read one page, or stop before your full goal."
	}
	switch goal.Type {
	case "minutes":
		if goal.Amount >= 5 {
			microMinutes := min(goal.Amount/5, (goal.Amount+5)/6)
			stepMinutes := min(goal.Amount-1, max(microMinutes+1, (goal.Amount+1)/2))
			plan.Micro, plan.Step = minuteGoal(microMinutes), minuteGoal(stepMinutes)
			micro, step, templateName = formatTimedTemplate(category, reason, microMinutes, stepMinutes)
		}
	case "repetitions":
		templateName = "repetitions"
		if goal.Amount > 1 {
			plan.Micro = HabitGoal{Type: "repetitions", Amount: max(1, goal.Amount/3), Unit: goal.Unit}
			plan.Step = HabitGoal{Type: "repetitions", Amount: min(goal.Amount-1, max(plan.Micro.Amount+1, (goal.Amount+1)/2)), Unit: goal.Unit}
			micro, step = "Complete the smaller repetition goal.", "Complete the step-up repetition goal."
		}
	}
	if goal.MicroQuest != "" {
		plan.Micro = action
		micro = goal.MicroQuest
		templateName += "_custom"
	}
	return plan, micro, step, templateName
}
