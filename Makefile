.PHONY: backend-test frontend-test frontend-build

backend-test:
	cd backend && python -m pytest

frontend-test:
	cd frontend && npm test

frontend-build:
	cd frontend && npm run build
