-- local_time(utc) は閲覧側で登録する関数で、閲覧者のタイムゾーンの壁時計時刻 (YYYY-MM-DD HH:MM) を返す。
-- 閲覧中にタイムゾーンは変わらず、問い合わせのたびに JS の関数で変換し直すと遅いので、開いたときに一度だけ表にする

CREATE TEMP TABLE clocks_local AS
SELECT rowid AS seq, task_id, local_time(start) AS start, local_time(end) AS end, minutes
FROM task_clocks;

CREATE TEMP TABLE tasks_local AS
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
  count(*) AS clock_count,
  CASE WHEN t.status = 'TODO' THEN NULL ELSE substr(coalesce(local_time(t.closed_at), max(c.end)), 1, 10) END AS completed_date
FROM tasks t
JOIN clocks_local c ON c.task_id = t.id
GROUP BY t.id;

CREATE TEMP TABLE daily_work AS
SELECT substr(c.start, 1, 10) AS date, t.title, sum(c.minutes) AS minutes
FROM clocks_local c
JOIN tasks t ON t.id = c.task_id
GROUP BY date, t.title;

CREATE TEMP TABLE activity_daily AS
SELECT substr(local_time(start), 1, 10) AS date, title, sum(minutes) AS minutes
FROM activity_clocks
GROUP BY date, title;

-- 前のセッションに含まれるセッションがあるので、それまでで最も遅い終了から測る。重なれば 0
CREATE TEMP TABLE session_gaps AS
SELECT task_id, start AS resumed_at, max(0, round((julianday(start) - julianday(prev_end)) * 1440)) AS minutes
FROM (
  SELECT task_id, start,
    max(end) OVER (PARTITION BY task_id ORDER BY start, seq ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_end
  FROM clocks_local
)
WHERE prev_end IS NOT NULL;

-- 同じタスクのセッションを、間隔が 60 分 (summary.ts の RESUME_GAP_MINUTES) 未満ならつなげた集中ブロック。
-- 間隔も作業時間も、重なりを二重に数えないよう、それまでで最も遅い終了から測る
CREATE TEMP TABLE focus_blocks AS
SELECT task_id, min(start) AS start, max(end) AS end, sum(minutes) AS minutes, count(*) AS sessions
FROM (
  SELECT task_id, start, end, minutes,
    sum(brk) OVER (PARTITION BY task_id ORDER BY start, seq) AS block
  FROM (
    SELECT task_id, start, end, seq,
      CASE WHEN prev_end IS NULL OR prev_end <= start THEN minutes
        ELSE max(0, round((julianday(end) - julianday(prev_end)) * 1440)) END AS minutes,
      CASE WHEN prev_end IS NULL OR round((julianday(start) - julianday(prev_end)) * 1440) >= 60 THEN 1 ELSE 0 END AS brk
    FROM (
      SELECT *, max(end) OVER (PARTITION BY task_id ORDER BY start, seq ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_end
      FROM clocks_local
    )
  )
)
GROUP BY task_id, block;

CREATE INDEX temp.clocks_local_task ON clocks_local (task_id, start);
CREATE INDEX temp.tasks_local_completed ON tasks_local (completed_date);
CREATE INDEX temp.session_gaps_resumed ON session_gaps (resumed_at);
CREATE INDEX temp.activity_daily_date ON activity_daily (date);
CREATE INDEX temp.focus_blocks_start ON focus_blocks (start);
