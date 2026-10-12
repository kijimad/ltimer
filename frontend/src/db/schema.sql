-- 時点はすべて UTC の ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)。暦日への振り分けは閲覧側で views.sql を通して行う

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  file TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('TODO', 'DONE', 'CLOSE')),
  closed_at TEXT,
  -- :Effort: の見積もり (分)
  effort_minutes INTEGER,
  -- DEADLINE は時点ではなく暦日 (YYYY-MM-DD)
  deadline TEXT
);

CREATE TABLE task_clocks (
  task_id INTEGER NOT NULL REFERENCES tasks (id),
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  minutes INTEGER NOT NULL
);

CREATE TABLE activity_clocks (
  title TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  minutes INTEGER NOT NULL
);

-- created / published は時点ではなく暦日 (YYYY-MM-DD)
CREATE TABLE drafts (
  file TEXT NOT NULL,
  title TEXT NOT NULL,
  created TEXT NOT NULL,
  published TEXT,
  lead_time_days INTEGER,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published'))
);

CREATE INDEX task_clocks_task ON task_clocks (task_id);
