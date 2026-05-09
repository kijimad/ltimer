# ltimer

org-mode のタスク CLOCK エントリからリードタイムを可視化するダッシュボード。

## 概要

org-mode で管理しているタスクの LOGBOOK (CLOCK エントリ) をパースし、リードタイム・WIP・スループットなどを可視化する静的ダッシュボードを生成する。長期間 WIP を占有しているタスクや滞留ボトルネックを発見しやすくすることが目的。

## 構成

- `frontend/` - Vite + React + TypeScript の SPA ダッシュボード (Recharts)
- `scripts/parse_workflow.py` - org ファイルからタスクデータを JSON に変換
- `scripts/parse_draft.py` - draft タグのリードタイムを JSON に変換

## パイプライン

1. Python スクリプトが `*.org` ファイルをパース
2. JSON (`frontend/public/workflow-data.json`, `draft-data.json`) を出力
3. Vite でビルドした SPA が JSON を読んで Recharts で可視化

## 使い方

```sh
# データ生成
python scripts/parse_workflow.py <org-dir> [output-json]
python scripts/parse_draft.py <org-dir> [output-json]

# 開発サーバー
cd frontend && npm install && npm run dev
```

## ページ

| ページ | 内容 |
|---|---|
| Tasks (`/`) | タスクのリードタイム・WIP・スループット等と制約理論 (TOC) メトリクス。週/月の集計単位切替可能 |
| Draft (`/draft`) | draft タグ付きファイルのリードタイム。下書き期間の長期化を検出 |

## デプロイ

GitHub Actions (`publish.yml`) で GitHub Pages にデプロイ。`workflow_dispatch` または `repository_dispatch` でトリガー。
