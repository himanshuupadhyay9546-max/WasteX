.PHONY: up down build logs test lint seed clean ml-train

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-simulator:
	docker compose logs -f simulator

seed:
	docker compose exec postgres psql -U ecoroute -d ecoroute_db -f /docker-entrypoint-initdb.d/02_seed.sql

ml-train:
	python services/ml/train_fill_predictor.py
	python services/ml/train_cv_classifier.py
	python services/ml/train_dumping_detector.py

test:
	pytest apps/api -v

clean:
	docker compose down -v
