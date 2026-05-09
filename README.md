# ltimer

org-mode のタスク CLOCK エントリからリードタイムを可視化するダッシュボード。

## 概要

org-mode で管理しているタスクの LOGBOOK (CLOCK エントリ) をパースし、リードタイム・WIP・スループットなどを可視化する静的ダッシュボードを生成する。長期間 WIP を占有しているタスクや滞留ボトルネックを発見しやすくすることが目的。

## パイプライン

1. Python スクリプト (`scripts/parse_workflow.py`) が `*.org` ファイルをパース
2. JSON (`public/workflow-data.json`) を出力
3. HTML ダッシュボード (`public/index.html`) が JSON を読んで Chart.js で可視化

## 使い方

```sh
python scripts/parse_workflow.py <org-dir> [output-json]
```

- `<org-dir>`: org ファイルが格納されたディレクトリ
- `[output-json]`: 出力先 (デフォルト: `public/workflow-data.json`)

生成後、`public/index.html` をブラウザで開く。
