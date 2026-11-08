package main

// recoveryEligibility centralizes product rules from Assignment 9.
// Streak must be >=3; maximum 3 recovery windows per rolling 30 days,
// at most 2 consecutive windows without returning to the full goal.
func recoveryEligibility(streak, used30Days, consecutive int) (bool, string) {
	if streak < 3 {
		return false, "Recovery unlocks after a streak of at least 3 days"
	}
	if used30Days >= 3 || consecutive >= 2 {
		return false, "Recovery limit reached. Streak reset; all history and XP are preserved."
	}
	return true, ""
}
