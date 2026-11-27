package main

import (
	"strings"
	"testing"
)

func TestClamp(t *testing.T) {
	if clamp(0, 1, 5) != 1 || clamp(10, 1, 5) != 5 || clamp(3, 1, 5) != 3 {
		t.Fatal("clamp out of range")
	}
}
func TestTemplate(t *testing.T) {
	plan, micro, step, name := recoveryPlan(minuteGoal(30), "Reading", "exams")
	if !strings.Contains(micro, "5 minutes") || !strings.Contains(step, "15 minutes") || name != "template_reading_exams" || plan.Micro.Amount != 5 || plan.Step.Amount != 15 {
		t.Fatalf("unexpected template: %q %q %q", micro, step, name)
	}
}

func TestRecoveryEligibility(t *testing.T) {
	scenarios := []struct {
		streak, used, consecutive int
		want                      bool
	}{
		{2, 0, 0, false}, {3, 0, 0, true}, {12, 2, 1, true},
		{12, 3, 1, false}, {12, 1, 2, false},
	}
	for _, s := range scenarios {
		got, _ := recoveryEligibility(s.streak, s.used, s.consecutive)
		if got != s.want {
			t.Errorf("eligibility(%d,%d,%d)=%v want %v", s.streak, s.used, s.consecutive, got, s.want)
		}
	}
}
