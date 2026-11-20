CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, hero_class TEXT NOT NULL DEFAULT 'Mage'
 CHECK (hero_class IN ('Warrior','Mage','Priest')),
 xp INT NOT NULL DEFAULT 0, is_demo BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS habits (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Study',
 target_minutes INT NOT NULL CHECK (target_minutes BETWEEN 1 AND 1440),
 streak_count INT NOT NULL DEFAULT 0, best_streak INT NOT NULL DEFAULT 0,
 consecutive_recoveries INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), archived BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE habits ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
UPDATE habits SET archived_at=now() WHERE archived AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE TABLE IF NOT EXISTS habit_logs (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
 log_date DATE NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('full','missed','recovery','step_up')),
 minutes INT NOT NULL DEFAULT 0, notes JSONB NOT NULL DEFAULT '[]',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(habit_id,log_date,kind)
);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id,created_at);
CREATE TABLE IF NOT EXISTS recovery_sessions (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
 missed_date DATE NOT NULL, reason TEXT NOT NULL, workload TEXT NOT NULL DEFAULT 'medium',
 energy INT NOT NULL DEFAULT 3, status TEXT NOT NULL DEFAULT 'offered'
 CHECK(status IN ('offered','accepted','micro_completed','step_completed','completed','expired')),
 streak_before INT NOT NULL DEFAULT 0,
 micro_minutes INT NOT NULL, step_minutes INT NOT NULL,
 micro_text TEXT NOT NULL, step_text TEXT NOT NULL,
 reported_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
 offered_at TIMESTAMPTZ NOT NULL DEFAULT now(), accepted_at TIMESTAMPTZ,
 micro_completed_at TIMESTAMPTZ, step_completed_at TIMESTAMPTZ,
 original_completed_at TIMESTAMPTZ, review_started_at TIMESTAMPTZ,
 review_ended_at TIMESTAMPTZ, template_name TEXT NOT NULL,
 hero_log TEXT, UNIQUE(habit_id,missed_date)
);
CREATE INDEX IF NOT EXISTS idx_recovery_habit ON recovery_sessions(habit_id,reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_user ON recovery_sessions(user_id,reported_at DESC);
CREATE TABLE IF NOT EXISTS analytics_events (
 id UUID PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 name TEXT NOT NULL, properties JSONB NOT NULL DEFAULT '{}',
 is_demo BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_name_time ON analytics_events(name,created_at DESC);
CREATE TABLE IF NOT EXISTS personal_rewards (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
 started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
