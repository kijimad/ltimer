# ltimer

org-mode のタスク CLOCK エントリからリードタイムを可視化するダッシュボード。

## 構成

- `frontend/` - Vite + React + TypeScript の SPA ダッシュボード (Recharts)
- `scripts/parse_workflow.py` - org ファイルからタスクデータを JSON に変換
- `scripts/parse_draft.py` - draft タグのリードタイムを JSON に変換
- `scripts/parse_activities.py` - workflow.org から日次習慣データを JSON に変換

## パイプライン

```
roam/*.org
    |
    v
parse_workflow.py ──> workflow-data.json ──> Tasks page (/)
parse_draft.py    ──> draft-data.json    ──> Draft page (/draft)
parse_activities.py -> activity-data.json -> Activity page (/activity)
    |
    v
Vite build ──> GitHub Pages (kijimad.github.io/ltimer/)
```

## ページ

| ページ | 内容 |
|---|---|
| Tasks (`/`) | タスクのリードタイム・WIP・スループット等。週/月の集計単位切替可能 |
| Draft (`/draft`) | draft タグ付きファイルのリードタイム。下書き期間の長期化を検出 |
| Activity (`/activity`) | workflow.org の日次習慣の投下時間・ストリーク・ヒートマップ |
| Help (`/help`) | リードタイムの定義・用語・集計ロジックの説明 |

## 開発

```sh
# データ生成
python scripts/parse_workflow.py ~/roam frontend/public/workflow-data.json
python scripts/parse_draft.py ~/roam frontend/public/draft-data.json
python scripts/parse_activities.py ~/roam frontend/public/activity-data.json

# 開発サーバー
cd frontend && npm install && npm run dev

# テスト・ビルド
cd frontend && npx vitest run && npm run build
```

## デプロイ

GitHub Actions (`publish.yml`) で GitHub Pages にデプロイ。`workflow_dispatch` または `repository_dispatch` でトリガー。
