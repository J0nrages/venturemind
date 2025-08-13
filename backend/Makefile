.PHONY: help install dev test lint format run migrate clean type-gen

help:
	@echo "Available commands:"
	@echo "  install  - Install dependencies"
	@echo "  dev      - Run development server"
	@echo "  test     - Run tests"
	@echo "  lint     - Run linting"
	@echo "  format   - Format code"
	@echo "  migrate  - Run database migrations"
	@echo "  clean    - Remove cache and temp files"
	@echo "  type-gen - Generate TypeScript types"

install:
	uv sync

dev:
	uv run uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

test:
	uv run pytest

lint:
	uv run ruff check .
	uv run mypy .

format:
	uv run black .
	uv run ruff check --fix .

migrate:
	uv run alembic upgrade head

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .ruff_cache .mypy_cache .pytest_cache

type-gen:
	uv run python scripts/generate_types.py