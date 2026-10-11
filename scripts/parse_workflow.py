#!/usr/bin/env python3
"""Parse CLOCK entries from all org files and output JSON for lead time dashboard."""

import glob
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

CLOCK_RE = re.compile(
    r"CLOCK: \[(\d{4}-\d{2}-\d{2}) \w+ (\d{2}:\d{2})\]--\[(\d{4}-\d{2}-\d{2}) \w+ (\d{2}:\d{2})\]\s+=>\s+(\d+):(\d{2})"
)
HEADING_RE = re.compile(r"^(\*+)\s+(TODO|DONE|CLOSE)\s+(.+?)(?:\s+:[\w:]+:)?\s*$")
CLOSED_RE = re.compile(r"CLOSED:\s+\[(\d{4}-\d{2}-\d{2}) \w+ (\d{2}:\d{2})\]")

SKIP_FILES = {"20210904124352-workflow.org"}
MIN_CLOCK_MINUTES = 25

# org のタイムスタンプはタイムゾーンを持たないので JST とみなす
JST = timezone(timedelta(hours=9), "JST")


def to_utc(date, time):
    local = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M").replace(tzinfo=JST)
    return local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_org_file(filepath):
    """Extract tasks with CLOCK entries from a single org file."""
    tasks = []
    current_task = None
    basename = os.path.basename(filepath)

    if basename in SKIP_FILES:
        return []

    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")

            heading_m = HEADING_RE.match(line)
            if heading_m:
                status = heading_m.group(2)
                title = heading_m.group(3).strip()

                current_task = {
                    "title": title,
                    "status": status,
                    "file": basename,
                    "clocks": [],
                    "closed_at": None,
                }
                tasks.append(current_task)
                continue

            if current_task:
                closed_m = CLOSED_RE.search(line)
                if closed_m:
                    current_task["closed_at"] = to_utc(closed_m.group(1), closed_m.group(2))
                    continue

                clock_m = CLOCK_RE.search(line)
                if clock_m:
                    hours = int(clock_m.group(5))
                    minutes = int(clock_m.group(6))
                    total = hours * 60 + minutes
                    if total < MIN_CLOCK_MINUTES:
                        continue
                    current_task["clocks"].append(
                        {
                            "start": to_utc(clock_m.group(1), clock_m.group(2)),
                            "end": to_utc(clock_m.group(3), clock_m.group(4)),
                            "minutes": total,
                        }
                    )

    return [t for t in tasks if t["clocks"]]


def parse_all(roam_dir):
    tasks = []
    for filepath in sorted(glob.glob(os.path.join(roam_dir, "*.org"))):
        tasks.extend(parse_org_file(filepath))
    return tasks


def aggregate(tasks):
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "generated_at": generated_at,
        "tasks": [
            {
                "title": t["title"],
                "file": t["file"],
                "status": t["status"],
                "closed_at": t["closed_at"],
                "clocks": t["clocks"],
            }
            for t in tasks
        ],
    }


def main():
    roam_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output = sys.argv[2] if len(sys.argv) > 2 else "frontend/public/workflow-data.json"
    tasks = parse_all(roam_dir)
    data = aggregate(tasks)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {output} ({len(data['tasks'])} tasks)")


if __name__ == "__main__":
    main()
