# ltimer

org-mode のタスク CLOCK エントリからリードタイムを可視化するダッシュボード。

## 構成

- `frontend/` - Vite + React + TypeScript の SPA ダッシュボード (Recharts)
- `scripts/parse_workflow.py` - org ファイルからタスクデータを JSON に変換
- `scripts/parse_draft.py` - draft タグのリードタイムを JSON に変換
- `scripts/parse_activities.py` - workflow.org から日次習慣データを JSON に変換
