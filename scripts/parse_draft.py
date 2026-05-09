#!/usr/bin/env python3
"""Parse org-roam files for draft tag lead time analysis.

Draft = filename contains __draft_ (e.g. __draft_book.org)
Published = filename had __draft_ removed via git rename (e.g. __book.org)
Creation date = filename timestamp (20210508233810 or 20260127T093439)
Published date = git rename commit date
"""

import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime

FILETAGS_RE = re.compile(r"^#\+filetags:\s*(.+)", re.IGNORECASE)
TITLE_RE = re.compile(r"^#\+title:\s*(.+)", re.IGNORECASE)
# Match both 20210508233810 and 20260127T093439
FILENAME_TS_RE = re.compile(r"^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})")
DRAFT_IN_NAME_RE = re.compile(r"__draft_")


def parse_filename_date(basename):
    """Extract creation date from org-roam filename timestamp."""
    m = FILENAME_TS_RE.match(basename)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None


def parse_org_title(filepath):
    """Extract title from an org file."""
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("*"):
                break
            m = TITLE_RE.match(line)
            if m:
                return m.group(1).strip()
    return None


def find_published_files(roam_dir):
    """Find files that were renamed from __draft_ to non-draft via git log.

    Returns dict: {current_filename: publish_date}
    """
    published = {}
    try:
        result = subprocess.run(
            ["git", "log", "--all", "--diff-filter=R", "--name-status", "-M", "--format=%aI", "--", "*.org"],
            capture_output=True,
            text=True,
            cwd=roam_dir,
            timeout=30,
        )
        current_date = None
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            # ISO date line from --format=%aI
            if line.startswith("20") and "T" in line and ("+" in line or "-" in line[10:]):
                current_date = line[:10]
                continue
            if line.startswith("R") and "\t" in line:
                parts = line.split("\t")
                if len(parts) >= 3:
                    old_name = parts[1]
                    new_name = parts[2]
                    # Draft removed: old has __draft_, new doesn't
                    if DRAFT_IN_NAME_RE.search(old_name) and not DRAFT_IN_NAME_RE.search(new_name):
                        if current_date and new_name not in published:
                            published[new_name] = current_date
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return published


def parse_all(roam_dir):
    published_map = find_published_files(roam_dir)
    entries = []

    for filepath in sorted(glob.glob(os.path.join(roam_dir, "*.org"))):
        basename = os.path.basename(filepath)
        created = parse_filename_date(basename)
        if not created:
            continue

        title = parse_org_title(filepath) or basename
        is_draft = bool(DRAFT_IN_NAME_RE.search(basename))

        if is_draft:
            entries.append(
                {
                    "file": basename,
                    "title": title,
                    "created": created,
                    "published": None,
                    "lead_time_days": None,
                    "status": "draft",
                }
            )
        elif basename in published_map:
            pub_date = published_map[basename]
            created_dt = datetime.strptime(created, "%Y-%m-%d")
            published_dt = datetime.strptime(pub_date, "%Y-%m-%d")
            lead_time = (published_dt - created_dt).days
            entries.append(
                {
                    "file": basename,
                    "title": title,
                    "created": created,
                    "published": pub_date,
                    "lead_time_days": lead_time,
                    "status": "published",
                }
            )

    return entries


def main():
    roam_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output = sys.argv[2] if len(sys.argv) > 2 else "frontend/public/draft-data.json"
    entries = parse_all(roam_dir)
    data = {
        "generated_at": datetime.now().isoformat(),
        "entries": sorted(entries, key=lambda x: -(x["lead_time_days"] or 0)),
    }
    with open(output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    draft_count = sum(1 for e in entries if e["status"] == "draft")
    pub_count = sum(1 for e in entries if e["status"] == "published")
    print(f"Wrote {output} ({draft_count} drafts, {pub_count} published)")


if __name__ == "__main__":
    main()
