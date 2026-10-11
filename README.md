# ltimer

org-mode のタスク CLOCK エントリからリードタイムを可視化するダッシュボード。

## 構成

- `frontend/` - Vite + React + TypeScript の SPA ダッシュボード (Recharts)
- `frontend/scripts/build-db.ts` - org ファイルから SQLite の DB (`frontend/public/ltimer.db`) を作る (`make data`)
- `frontend/src/db/` - DB のスキーマ (`schema.sql`) と、ブラウザで sql.js から問い合わせる集計

DB は手元でも `sqlite3 frontend/public/ltimer.db` で問い合わせられる。時点は UTC で保存している。
