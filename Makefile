.DEFAULT_GOAL := help
ROAM_DIR ?= ~/roam

# --- Data ---

.PHONY: data
data: ## org ファイルから DB (frontend/public/ltimer.db) を生成
	node frontend/scripts/build-db.ts $(ROAM_DIR)

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
