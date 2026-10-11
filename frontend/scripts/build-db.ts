// org-roam のディレクトリから ltimer.db を作る: node scripts/build-db.ts <roam_dir> <output>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { parseTasks, parseActivities, parseDraft, parsePublishedFromGitLog, WORKFLOW_FILE } from "./org.ts";

const here = dirname(fileURLToPath(import.meta.url));
const [roamDir = ".", output = join(here, "..", "public", "ltimer.db")] = process.argv.slice(2);

function gitRenames(dir: string): string {
  try {
    return execFileSync("git", ["log", "--all", "--diff-filter=R", "--name-status", "-M", "--format=%aI", "--", "*.org"], {
      cwd: dir,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

const files = readdirSync(roamDir).filter((f) => f.endsWith(".org")).sort();
const read = (f: string) => readFileSync(join(roamDir, f), "utf8");
const texts = new Map(files.map((f) => [f, read(f)]));

const tasks = files.flatMap((f) => parseTasks(f, texts.get(f)!));
const activities = texts.has(WORKFLOW_FILE) ? parseActivities(texts.get(WORKFLOW_FILE)!) : [];
const published = parsePublishedFromGitLog(gitRenames(roamDir));
const drafts = files.map((f) => parseDraft(f, texts.get(f)!, published)).filter((d) => d !== null);

const SQL = await initSqlJs();
const db = new SQL.Database();
db.exec(readFileSync(join(here, "..", "src", "db", "schema.sql"), "utf8"));
db.run("INSERT INTO meta VALUES ('generated_at', ?)", [new Date().toISOString().replace(/\.\d{3}Z$/, "Z")]);
db.exec("BEGIN");
tasks.forEach((t, i) => {
  db.run("INSERT INTO tasks VALUES (?, ?, ?, ?, ?)", [i, t.title, t.file, t.status, t.closed_at]);
  for (const c of t.clocks) db.run("INSERT INTO task_clocks VALUES (?, ?, ?, ?)", [i, c.start, c.end, c.minutes]);
});
for (const a of activities) {
  for (const c of a.clocks) db.run("INSERT INTO activity_clocks VALUES (?, ?, ?, ?)", [a.title, c.start, c.end, c.minutes]);
}
for (const d of drafts) {
  db.run("INSERT INTO drafts VALUES (?, ?, ?, ?, ?, ?)", [d.file, d.title, d.created, d.published, d.lead_time_days, d.status]);
}
db.exec("COMMIT");
writeFileSync(output, db.export());
console.log(`Wrote ${output} (${tasks.length} tasks, ${activities.length} activities, ${drafts.length} drafts)`);
