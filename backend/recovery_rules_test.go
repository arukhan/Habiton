package main

import "testing"

func TestEligibilityTable(t *testing.T) {
	cases := []struct {
		streak, used, consecutive int
		ok                        bool
	}{{2, 0, 0, false}, {3, 0, 0, true}, {12, 2, 1, true}, {12, 3, 1, false}, {12, 1, 2, false}}
	for _, tc := range cases {
		got, _ := recoveryEligibility(tc.streak, tc.used, tc.consecutive)
		if got != tc.ok {
			t.Errorf("eligibility(%d,%d,%d)=%v", tc.streak, tc.used, tc.consecutive, got)
		}
	}
}
