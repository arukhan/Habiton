-- NULL goals are legacy minute goals. Keep the old columns for older clients.
ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal jsonb;
ALTER TABLE recovery_sessions ADD COLUMN IF NOT EXISTS goals jsonb;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS goal jsonb;

-- Preserve historic targets before users can change a habit's type.
UPDATE habit_logs l
SET goal = jsonb_build_object('type', 'minutes', 'amount',
    CASE WHEN l.minutes > 0 THEN l.minutes ELSE h.target_minutes END)
FROM habits h
WHERE h.id = l.habit_id AND l.goal IS NULL AND l.kind = 'full' AND h.goal IS NULL;

UPDATE recovery_sessions r
SET goals = jsonb_build_object(
    'original', jsonb_build_object('type', 'minutes', 'amount', h.target_minutes),
    'micro', jsonb_build_object('type', 'minutes', 'amount', r.micro_minutes),
    'step', jsonb_build_object('type', 'minutes', 'amount', r.step_minutes))
FROM habits h
WHERE h.id = r.habit_id AND r.goals IS NULL AND h.goal IS NULL;
