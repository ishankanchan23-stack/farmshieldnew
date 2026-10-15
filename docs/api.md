# API guide

Interactive OpenAPI and request schemas are available from the running API at `/docs`; the schema JSON is at `/openapi.json`. All application endpoints are prefixed with `/api/v1`. Authentication uses `Authorization: Bearer <access_token>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Farms and crops | `GET/POST /farms`, `GET/PATCH/DELETE /farms/{farm_id}`, `GET/POST /crops` |
| Scans | `POST /scans/analyze`, `GET /scans`, `GET/DELETE /scans/{scan_id}`, `GET /scans/{scan_id}/image` |
| Library | `GET /diseases`, `GET /diseases/{disease_id}` |
| Weather | `GET /weather/current`, `GET /weather/forecast`, `GET /weather/risks` |
| Analytics | `GET /analytics/overview`, `GET /analytics/trends`, `GET /analytics/diseases` |
| Reports | `GET /reports/scans/{scan_id}/pdf`, `GET /reports/scans.csv` |
| User | `GET /notifications`, `PATCH /notifications/{notification_id}/read`, `GET/PATCH /settings` |

Scan listing supports `page`, `page_size` (maximum 100), `crop`, `disease`, `search`, `start_date`, and `end_date`. Responses use `{items,total,page,page_size}`. `POST /scans/analyze` accepts multipart `file`, optional `farm_id`, and crop query parameter. Uploads above `MAX_UPLOAD_MB` are rejected; the file itself is inspected rather than trusted by extension alone.

Errors use a JSON `detail` message and appropriate 4xx/5xx status codes. Weather calls can return `503` when the provider is not configured, rate limited, or unavailable. Scan status values are `classified`, `uncertain`, `unavailable`, or `error`.
