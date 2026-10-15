# FarmShield AI backend

FastAPI API, SQLAlchemy persistence, optional PyTorch inference, OpenWeatherMap integration, and PDF/CSV reports.

Run all commands from this folder. See the [root README](../README.md) for the complete Windows PowerShell setup.

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

OpenAPI: <http://127.0.0.1:8000/docs>. Tests: `python -m pytest`.

The API creates the local SQLite tables at startup for convenience; Alembic remains the schema versioning and upgrade path. The first migration establishes the current schema. No model weights are bundled. See [`docs/ai-model.md`](../docs/ai-model.md) and [`docs/security.md`](../docs/security.md).
