.DEFAULT_GOAL := help
ROAM_DIR ?= ~/roam

# --- Data ---

.PHONY: data
data: ## org ファイルからデータ JSON を生成
	python scripts/parse_workflow.py $(ROAM_DIR) frontend/public/workflow-data.json
	python scripts/parse_draft.py $(ROAM_DIR) frontend/public/draft-data.json
	python scripts/parse_activities.py $(ROAM_DIR) frontend/public/activity-data.json

# --- Frontend ---

.PHONY: install
install: ## npm install
	npm install --prefix frontend

.PHONY: dev
dev: ## 開発サーバー起動
	npm run dev --prefix frontend

.PHONY: build
build: ## プロダクションビルド
	npm run build --prefix frontend

.PHONY: test
test: ## テスト実行
	npm test --prefix frontend

.PHONY: lint
lint: ## lint 実行
	npm run lint --prefix frontend

.PHONY: help
help: ## ヘルプ
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'
