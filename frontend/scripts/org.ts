// org-roam のファイルから DB の行を作る。ファイルや git には触れない純関数だけを置く
import type { ClockRow, TaskRow, NoteRow } from "../src/db/rows.ts";

// Python の \w と同じく、日本語の曜日やタグにも一致させる
const W = "[\\p{L}\\p{N}_]";
const CLOCK_RE = new RegExp(
  `CLOCK: \\[(\\d{4}-\\d{2}-\\d{2}) ${W}+ (\\d{2}:\\d{2})\\]--\\[(\\d{4}-\\d{2}-\\d{2}) ${W}+ (\\d{2}:\\d{2})\\]\\s+=>\\s+(\\d+):(\\d{2})`,
  "u",
);
const HEADING_RE = new RegExp(`^(\\*+)\\s+(TODO|DONE|CLOSE)\\s+(.+?)(?:\\s+:(?:${W}|:)+:)?\\s*$`, "u");
const CLOSED_RE = /CLOSED:\s+\[(\d{4}-\d{2}-\d{2}) [\p{L}\p{N}_]+ (\d{2}:\d{2})\]/u;
const DEADLINE_RE = /DEADLINE:\s+<(\d{4}-\d{2}-\d{2})/u;
const EFFORT_RE = /^\s*:Effort:\s+(.+?)\s*$/iu;
/** org-duration の既定の単位 (分) */
const DURATION_UNITS: Record<string, number> = { min: 1, h: 60, d: 1440, w: 10080 };
const TITLE_RE = /^#\+title:\s*(.+)/iu;
const FILENAME_TS_RE = /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/;
const FILENAME_TAGS_RE = /__([^.]+)\.org$/;
const DRAFT_TAG = "draft";

/** denote の改名はタイトルやタグだけを変えるので、タイムスタンプが同じなら同じメモ */
function noteId(file: string): string | null {
  return FILENAME_TS_RE.exec(file)?.[0] ?? null;
}

function filenameTags(file: string): string[] {
  return [...new Set(FILENAME_TAGS_RE.exec(file)?.[1].split("_").filter((t) => t !== "") ?? [])];
}
const ROTATION_SUFFIX_RE = /\s+\d+$/u;

export const WORKFLOW_FILE = "20210904124352-workflow.org";
/** ポモドーロ未満の CLOCK はタスクの作業として数えない */
const MIN_CLOCK_MINUTES = 25;
/** workflow.org の Archives にある、習慣ではない一度きりのタスク */
const SKIP_ACTIVITIES = new Set(["タスク状況をレポート化する", "よく使うagenda viewを一発で開けるようにする", "チェックを忘れるとalertされなくなる"]);

/** Python のテキストモードと同じく \r\n, \r, \n のどれでも行を区切る */
const lines = (text: string) => text.split(/\r\n|\r|\n/);

/** org のタイムスタンプはタイムゾーンを持たないので JST とみなし、UTC の ISO 8601 にする */
export function toUtc(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 9, mi)).toISOString().replace(".000Z", "Z");
}

function parseClock(line: string): ClockRow | null {
  const m = CLOCK_RE.exec(line);
  if (!m) return null;
  return { start: toUtc(m[1], m[2]), end: toUtc(m[3], m[4]), minutes: Number(m[5]) * 60 + Number(m[6]) };
}

/** H:MM / H:MM:SS と、1d3h5min や 1h 30min のような単位つきの書き方を分にする。読めなければ null */
export function parseDuration(text: string): number | null {
  const clock = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3] ?? 0) / 60;
  const compact = text.replace(/\s+/g, "");
  const parts = [...compact.matchAll(/(\d+(?:\.\d+)?)(min|h|d|w)/g)];
  if (parts.length === 0 || parts.map((p) => p[0]).join("") !== compact) return null;
  return parts.reduce((sum, p) => sum + Number(p[1]) * DURATION_UNITS[p[2]], 0);
}

export function parseTasks(file: string, text: string): TaskRow[] {
  if (file === WORKFLOW_FILE) return [];
  const tasks: TaskRow[] = [];
  let current: TaskRow | null = null;
  for (const line of lines(text)) {
    const heading = HEADING_RE.exec(line);
    if (heading) {
      current = { title: heading[3].trim(), file, status: heading[2] as TaskRow["status"], closed_at: null, effort_minutes: null, deadline: null, clocks: [] };
      tasks.push(current);
      continue;
    }
    if (!current) continue;
    // CLOSED と DEADLINE は同じ行に並ぶことがある
    const closed = CLOSED_RE.exec(line);
    if (closed) current.closed_at = toUtc(closed[1], closed[2]);
    const deadline = DEADLINE_RE.exec(line);
    if (deadline) current.deadline = deadline[1];
    const effort = EFFORT_RE.exec(line);
    if (effort) current.effort_minutes = parseDuration(effort[1]);
    if (closed || deadline || effort) continue;
    const clock = parseClock(line);
    if (clock && clock.minutes >= MIN_CLOCK_MINUTES) current.clocks.push(clock);
  }
  return tasks.filter((t) => t.clocks.length > 0);
}

/** RepeatTasks と Archives の習慣。ローテーションの番号 ("英語を読む 3") を外して同じ習慣にまとめ、タイトル順に並べる */
export function parseActivities(text: string): { title: string; clocks: ClockRow[] }[] {
  const grouped = new Map<string, ClockRow[]>();
  let current: string | null = null;
  let inSection = false;
  for (const line of lines(text)) {
    if (line.startsWith("* ")) {
      inSection = ["RepeatTasks", "Archives"].includes(line.slice(2).trim());
      current = null;
      continue;
    }
    if (!inSection) continue;
    const heading = HEADING_RE.exec(line);
    if (heading) {
      current = heading[3].trim().replace(ROTATION_SUFFIX_RE, "");
      if (!grouped.has(current)) grouped.set(current, []);
      continue;
    }
    if (current === null) continue;
    const clock = parseClock(line);
    if (clock) grouped.get(current)!.push(clock);
  }
  return [...grouped]
    .filter(([title, clocks]) => clocks.length > 0 && !SKIP_ACTIVITIES.has(title))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([title, clocks]) => ({ title, clocks }));
}

export function parseTitle(text: string): string | null {
  for (const raw of lines(text)) {
    const line = raw.trim();
    if (line.startsWith("*")) break;
    const m = TITLE_RE.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

/** draft タグを外した改名の日付をメモの ID ごとに集める。ログは新しい順なので最初 (最新) を使う */
export function parsePublishedFromGitLog(log: string): Map<string, string> {
  const published = new Map<string, string>();
  let date: string | null = null;
  for (const raw of lines(log)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("20") && line.includes("T") && (line.includes("+") || line.slice(10).includes("-"))) {
      date = line.slice(0, 10);
      continue;
    }
    if (line.startsWith("R") && line.includes("\t")) {
      const [, oldName, newName] = line.split("\t");
      const id = newName === undefined ? null : noteId(newName);
      if (id && date && filenameTags(oldName).includes(DRAFT_TAG) && !filenameTags(newName).includes(DRAFT_TAG) && !published.has(id)) {
        published.set(id, date);
      }
    }
  }
  return published;
}

export function parseNote(file: string, text: string, published: Map<string, string>): NoteRow | null {
  const ts = FILENAME_TS_RE.exec(file);
  if (!ts) return null;
  const created = `${ts[1]}-${ts[2]}-${ts[3]}`;
  const title = parseTitle(text) ?? file;
  const allTags = filenameTags(file);
  const tags = allTags.filter((t) => t !== DRAFT_TAG);
  if (allTags.includes(DRAFT_TAG)) return { file, title, created, published: null, lead_time_days: null, status: "draft", tags };
  const pub = published.get(ts[0]);
  if (pub === undefined) return { file, title, created, published: created, lead_time_days: null, status: "published", tags };
  const days = Math.round((Date.parse(pub) - Date.parse(created)) / 86400000);
  return { file, title, created, published: pub, lead_time_days: days, status: "published", tags };
}
