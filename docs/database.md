# Data model

SQLAlchemy models cover users, farms, crops, scans, diseases, advisories, provider weather records, risk alerts, notifications, and user preferences. IDs are UUID strings; foreign keys and user ownership indexes protect lookup boundaries. Farms cascade their crops; scans are retained but detached when their farm is deleted. Scan images live in `backend/uploads` and only the generated storage name is persisted.

SQLite is the default local database. Set `DATABASE_URL` to a PostgreSQL SQLAlchemy URL such as `postgresql+psycopg://user:password@localhost:5432/farmshield` to use PostgreSQL (install the declared psycopg driver). Run `alembic upgrade head` after configuration. The current first migration creates the initial tables. Application startup also calls `create_all` for low-friction development; migrations are the intended schema upgrade workflow.

`backend/scripts/seed_demo.py` can create a local-only account and farm when `DEMO_PASSWORD` is supplied. It intentionally adds no artificial scan/prediction records.
