#!/usr/bin/env python3
"""Parse org files into a SQLite database for the dashboard."""

import os
import sqlite3
import sys
from datetime import datetime, timezone

import parse_activities
import parse_draft
import parse_workflow

SCHEMA = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "db", "schema.sql")


def build(roam_dir, output):
    tasks = parse_workflow.aggregate(parse_workflow.parse_all(roam_dir))["tasks"]
    workflow_file = os.path.join(roam_dir, parse_activities.WORKFLOW_FILE)
    activities = (
        parse_activities.aggregate(parse_activities.parse_workflow(workflow_file))["activities"]
        if os.path.exists(workflow_file)
        else []
    )
    drafts = parse_draft.parse_all(roam_dir)

    if os.path.exists(output):
        os.remove(output)
    db = sqlite3.connect(output)
    with open(SCHEMA, encoding="utf-8") as f:
        db.executescript(f.read())
    db.execute(
        "INSERT INTO meta VALUES ('generated_at', ?)",
        (datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),),
    )
    for i, t in enumerate(tasks):
        db.execute("INSERT INTO tasks VALUES (?, ?, ?, ?, ?)", (i, t["title"], t["file"], t["status"], t["closed_at"]))
        db.executemany(
            "INSERT INTO task_clocks VALUES (?, ?, ?, ?)",
            [(i, c["start"], c["end"], c["minutes"]) for c in t["clocks"]],
        )
    db.executemany(
        "INSERT INTO activity_clocks VALUES (?, ?, ?, ?)",
        [(a["title"], c["start"], c["end"], c["minutes"]) for a in activities for c in a["clocks"]],
    )
    db.executemany(
        "INSERT INTO drafts VALUES (?, ?, ?, ?, ?, ?)",
        [(e["file"], e["title"], e["created"], e["published"], e["lead_time_days"], e["status"]) for e in drafts],
    )
    db.commit()
    db.execute("VACUUM")
    db.close()
    return len(tasks), len(activities), len(drafts)


def main():
    roam_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output = sys.argv[2] if len(sys.argv) > 2 else "frontend/public/ltimer.db"
    n_tasks, n_activities, n_drafts = build(roam_dir, output)
    print(f"Wrote {output} ({n_tasks} tasks, {n_activities} activities, {n_drafts} drafts)")


if __name__ == "__main__":
    main()
