# Vertex Backend (scaffold)

This folder contains the Express + TypeScript backend for Vertex.

Auth endpoints (initial, in-memory):
- POST /api/auth/register { username, email, password }
- POST /api/auth/login { email, password }

Notes:
- Currently uses an in-memory Map for users and clients and activities. We will replace these with Postgres + raw SQL when we add persistence.
- New endpoints for Activities:
  - GET /api/activities?clientId=... — list activities for current user (optional filter by clientId)
  - GET /api/activities/recent?limit=10 — list recent activities for current user
  - POST /api/activities { type, description, date, clientId, customType? } — create activity (types: call|meeting|proposal|task). You can also pass `type: "other"` and `customType: "anything"` to use a custom activity type, or pass an arbitrary non-empty string as `type`.
  - PUT /api/activities/:id — update activity
  - DELETE /api/activities/:id — delete activity

Stats endpoints (analytics):
  - GET /api/stats/clients-active — { count }
  - GET /api/stats/clients-over-time?days=30 — [{ date: 'YYYY-MM-DD', total }]
  - GET /api/stats/activities-per-week?weeks=12 — [{ weekStart: 'YYYY-MM-DD', count }]
  - GET /api/stats/activities-by-type?days=30 — [{ type, count }]
  - GET /api/stats/activity-frequency?days=7 — [{ date:'YYYY-MM-DD', count }]
  - GET /api/stats/upcoming?limit=10 — list upcoming activities (>= now)
  - GET /api/stats/clients-no-recent?days=30 — list of clients without recent activity (and lastActivityAt/null)
- Use `.env` to set `JWT_SECRET` for production.

Quick smoke test (after starting server on port 4000):

1) Register + login to get token (save TOKEN):
   curl -s -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"username":"test","email":"t@example.com","password":"pass"}'
   curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"t@example.com","password":"pass"}' | jq

2) Create a client (save client id):
   curl -s -X POST http://localhost:4000/api/clients -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Acme","email":"acme@example.com"}' | jq

3) Create an activity:
   curl -s -X POST http://localhost:4000/api/activities -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"type":"call","description":"Intro call","date":"2025-01-01T12:00:00Z","clientId":"<CLIENT_ID>"}' | jq

4) List recent activities:
   curl -s -X GET "http://localhost:4000/api/activities/recent?limit=5" -H "Authorization: Bearer $TOKEN" | jq
