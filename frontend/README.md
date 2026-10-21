# FarmShield AI frontend

React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, and Axios client.

From this folder, copy `.env.example` to `.env`, run `npm install`, then `npm run dev`. The FastAPI backend must be available at `VITE_API_URL` (defaults to `http://127.0.0.1:8000`). Render's `host` value is accepted without a scheme and normalized to HTTPS. For other production hosts, set `VITE_API_URL` in the deployment environment and add the frontend origin to the backend's `CORS_ORIGINS`. Run `npm test` and `npm run build` for validation.

Authentication uses a short-lived bearer token in `sessionStorage`; it is cleared when the browser tab session ends. See the root README for the security trade-off and full setup.
