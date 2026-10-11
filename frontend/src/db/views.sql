-- local_time(utc) は閲覧側で登録する関数で、閲覧者のタイムゾーンの壁時計時刻 (YYYY-MM-DD HH:MM) を返す

CREATE TEMP VIEW clocks_local AS
SELECT rowid AS seq, task_id, local_time(start) AS start, local_time(end) AS end, minutes
FROM task_clocks;

CREATE TEMP VIEW tasks_local AS
SELECT
  t.id,
  t.title,
  t.file,
  t.status,
  min(c.start) AS first_clock_in,
  max(c.end) AS last_clock_out,
  local_time(t.closed_at) AS closed_at,
  CAST(julianday(substr(max(c.end), 1, 10)) - julianday(substr(min(c.start), 1, 10)) AS INTEGER) AS lead_time_days,
  sum(c.minutes) AS total_minutes,
  count(*) AS clock_count
FROM tasks t
JOIN clocks_local c ON c.task_id = t.id
GROUP BY t.id;

CREATE TEMP VIEW daily_work AS
SELECT substr(c.start, 1, 10) AS date, t.title, sum(c.minutes) AS minutes
FROM clocks_local c
JOIN tasks t ON t.id = c.task_id
GROUP BY date, t.title;

CREATE TEMP VIEW activity_daily AS
SELECT substr(local_time(start), 1, 10) AS date, title, sum(minutes) AS minutes
FROM activity_clocks
GROUP BY date, title;
