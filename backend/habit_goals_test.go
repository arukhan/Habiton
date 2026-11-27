package main

import "testing"

func TestRecoveryPlanGoalTypes(t *testing.T) {
	tests := []struct {
		name       string
		goal       HabitGoal
		category   string
		microType  string
		microCount int
		stepCount  int
		microText  string
	}{
		{"one minute reading", minuteGoal(1), "Reading", "action", 0, 0, "Read one paragraph."},
		{"ten repetitions", HabitGoal{Type: "repetitions", Amount: 10, Unit: "squats"}, "Fitness", "repetitions", 3, 5, "Complete the smaller repetition goal."},
		{"one repetition", HabitGoal{Type: "repetitions", Amount: 1}, "Fitness", "action", 0, 0, "Prepare one item you need for this habit."},
		{"one action", HabitGoal{Type: "action"}, "Other", "action", 0, 0, "Prepare one item you need for this habit."},
		{"custom action", HabitGoal{Type: "minutes", Amount: 15, MicroQuest: "Read one paragraph."}, "Reading", "action", 0, 8, "Read one paragraph."},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan, micro, _, _ := recoveryPlan(tt.goal, tt.category, "fatigue")
			if plan.Original.Type != tt.goal.Type || plan.Original.Amount != tt.goal.Amount || plan.Original.Unit != tt.goal.Unit ||
				plan.Micro.Type != tt.microType || plan.Micro.Amount != tt.microCount || plan.Step.Amount != tt.stepCount || micro != tt.microText {
				t.Fatalf("unexpected recovery plan: %+v, micro text %q", plan, micro)
			}
		})
	}
}

func TestHabitGoalValidation(t *testing.T) {
	input := habitInput{TargetMinutes: 15}
	if !input.normalizeGoal() || *input.Goal != minuteGoal(15) {
		t.Fatal("legacy minute target was not preserved")
	}
	input.Goal = &HabitGoal{Type: "action"}
	if !input.normalizeGoal() || input.Goal.minutes() != 0 {
		t.Fatal("an action must not create a fake duration")
	}
	for _, goal := range []HabitGoal{
		minuteGoal(0),
		minuteGoal(1441),
		{Type: "repetitions", Amount: 0},
		{Type: "action", Amount: 10},
		{Type: "unknown"},
	} {
		input.Goal = &goal
		if input.normalizeGoal() {
			t.Errorf("accepted invalid goal: %+v", goal)
		}
	}
}
