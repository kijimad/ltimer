#!/usr/bin/env python3
"""Parse CLOCK entries from workflow.org and output JSON for activity tracking."""

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

WORKFLOW_FILE = "20210904124352-workflow.org"

# Normalize rotated activity names: "英語を読む 3" -> "英語を読む"
ROTATION_SUFFIX_RE = re.compile(r"\s+\d+$")


def normalize_title(title: str) -> str:
    return ROTATION_SUFFIX_RE.sub("", title)


def parse_workflow(filepath):
    """Extract activities with CLOCK entries from workflow.org."""
    activities = []
    current = None
    in_repeat_or_archive = False

    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")

            # Track top-level sections
            if line.startswith("* "):
                section = line[2:].strip()
                in_repeat_or_archive = section in ("RepeatTasks", "Archives")
                current = None
                continue

            if not in_repeat_or_archive:
                continue

            heading_m = HEADING_RE.match(line)
            if heading_m:
                title = heading_m.group(3).strip()
                current = {"title": title, "clocks": []}
                activities.append(current)
                continue

            if current:
                clock_m = CLOCK_RE.search(line)
                if clock_m:
                    hours = int(clock_m.group(5))
                    minutes = int(clock_m.group(6))
                    total = hours * 60 + minutes
                    current["clocks"].append(
                        {
                            "date": clock_m.group(1),
                            "clock_in": f"{clock_m.group(1)} {clock_m.group(2)}",
                            "clock_out": f"{clock_m.group(3)} {clock_m.group(4)}",
                            "minutes": total,
                        }
                    )

    return [a for a in activities if a["clocks"]]


def aggregate(activities):
    now = datetime.now()

    # Group by normalized title, merge clocks
    grouped = defaultdict(list)
    for a in activities:
        key = normalize_title(a["title"])
        grouped[key].extend(a["clocks"])

    # Build activity summaries
    results = []
    for title, clocks in sorted(grouped.items()):
        total_minutes = sum(c["minutes"] for c in clocks)
        dates = sorted(set(c["date"] for c in clocks))
        results.append(
            {
                "title": title,
                "total_minutes": total_minutes,
                "session_count": len(clocks),
                "active_days": len(dates),
                "first_date": dates[0],
                "last_date": dates[-1],
            }
        )

    # Daily breakdown: [{date, activities: [{title, minutes}]}]
    daily = defaultdict(lambda: defaultdict(int))
    for a in activities:
        key = normalize_title(a["title"])
        for c in a["clocks"]:
            daily[c["date"]][key] += c["minutes"]

    daily_list = []
    for date in sorted(daily):
        acts = [
            {"title": t, "minutes": m} for t, m in sorted(daily[date].items())
        ]
        daily_list.append({"date": date, "activities": acts})

    # Skip non-habit tasks from Archives (one-off workflow tasks)
    skip_titles = {"タスク状況をレポート化する", "よく使うagenda viewを一発で開けるようにする", "チェックを忘れるとalertされなくなる"}
    results = [r for r in results if r["title"] not in skip_titles]
    # Also filter daily
    for d in daily_list:
        d["activities"] = [a for a in d["activities"] if a["title"] not in skip_titles]
    daily_list = [d for d in daily_list if d["activities"]]

    return {
        "generated_at": now.isoformat(),
        "activities": sorted(results, key=lambda x: -x["total_minutes"]),
        "daily": daily_list,
    }


def main():
    roam_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output = sys.argv[2] if len(sys.argv) > 2 else "frontend/public/activity-data.json"
    filepath = os.path.join(roam_dir, WORKFLOW_FILE)
    if not os.path.exists(filepath):
        print(f"Warning: {filepath} not found, writing empty data")
        data = {"generated_at": datetime.now().isoformat(), "activities": [], "daily": []}
    else:
        activities = parse_workflow(filepath)
        data = aggregate(activities)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {output} ({len(data['activities'])} activities, {len(data['daily'])} days)")


if __name__ == "__main__":
    main()
