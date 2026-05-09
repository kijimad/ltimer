#!/usr/bin/env python3
"""Parse CLOCK entries from all org files and output JSON for lead time dashboard."""

import glob
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime

CLOCK_RE = re.compile(
    r"CLOCK: \[(\d{4}-\d{2}-\d{2}) \w+ (\d{2}:\d{2})\]--\[(\d{4}-\d{2}-\d{2}) \w+ (\d{2}:\d{2})\]\s+=>\s+(\d+):(\d{2})"
)
HEADING_RE = re.compile(r"^(\*+)\s+(TODO|DONE|CLOSE)\s+(.+?)(?:\s+:[\w:]+:)?\s*$")
CLOSED_RE = re.compile(r"CLOSED:\s+\[(\d{4}-\d{2}-\d{2}) \w+ (\d{2}:\d{2})\]")

SKIP_FILES = {"20210904124352-workflow.org"}
MIN_CLOCK_MINUTES = 25


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
                    current_task["closed_at"] = f"{closed_m.group(1)} {closed_m.group(2)}"
                    continue

                clock_m = CLOCK_RE.search(line)
                if clock_m:
                    clock_in_date = clock_m.group(1)
                    clock_in_time = clock_m.group(2)
                    clock_out_date = clock_m.group(3)
                    clock_out_time = clock_m.group(4)
                    hours = int(clock_m.group(5))
                    minutes = int(clock_m.group(6))
                    total = hours * 60 + minutes
                    if total < MIN_CLOCK_MINUTES:
                        continue
                    current_task["clocks"].append(
                        {
                            "clock_in": f"{clock_in_date} {clock_in_time}",
                            "clock_out": f"{clock_out_date} {clock_out_time}",
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
    now = datetime.now()

    results = []
    for t in tasks:
        first_clock_in = min(c["clock_in"] for c in t["clocks"])
        last_clock_out = max(c["clock_out"] for c in t["clocks"])

        first_date = datetime.strptime(first_clock_in[:10], "%Y-%m-%d")
        last_date = datetime.strptime(last_clock_out[:10], "%Y-%m-%d")
        lead_time_days = (last_date - first_date).days

        total_minutes = sum(c["minutes"] for c in t["clocks"])

        results.append(
            {
                "title": t["title"],
                "file": t["file"],
                "status": t["status"],
                "first_clock_in": first_clock_in,
                "last_clock_out": last_clock_out,
                "closed_at": t.get("closed_at"),
                "lead_time_days": lead_time_days,
                "total_minutes": total_minutes,
                "clock_count": len(t["clocks"]),
            }
        )

    # Heatmap: aggregate minutes by day-of-week x hour
    heatmap = [[0] * 24 for _ in range(7)]
    # Daily work: {date: {task_title: minutes}}
    daily_work = defaultdict(lambda: defaultdict(int))
    for t in tasks:
        for c in t["clocks"]:
            dt = datetime.strptime(c["clock_in"], "%Y-%m-%d %H:%M")
            heatmap[dt.weekday()][dt.hour] += c["minutes"]
            daily_work[c["clock_in"][:10]][t["title"]] += c["minutes"]

    # Convert to sorted list: [{date, tasks: [{title, minutes}]}]
    daily_work_list = []
    for date in sorted(daily_work):
        tasks_on_day = [
            {"title": title, "minutes": mins}
            for title, mins in sorted(daily_work[date].items())
        ]
        daily_work_list.append({"date": date, "tasks": tasks_on_day})

    return {
        "generated_at": now.isoformat(),
        "tasks": sorted(results, key=lambda x: -x["lead_time_days"]),
        "heatmap": heatmap,
        "daily_work": daily_work_list,
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
