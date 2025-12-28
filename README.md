# Vertex — Agency Client & Activity Dashboard

A lightweight, extendable dashboard that helps agencies manage client portfolios, centralize activity tracking, and prioritize outreach.

## Problem it solves
- Agencies struggle to keep follow-ups and client work organized across spreadsheets and scattered notes.
- Lack of a compact, agency-focused workflow: client health, suggested next actions, and activity timelines are commonly absent from lightweight tooling.
- Small teams need an opinionated scaffold that is fast to iterate on and easy to extend into a production SaaS.

## Who is this for
- Digital agencies, consultancies, and small studios who need a lightweight CRM-style dashboard tailored for service delivery and client retention.
- Teams with distinct roles (owners, managers, staff) that require scoped visibility and simple role-based access control.

## Why this is useful
- Centralizes client data and interactions so teams never miss follow-ups.
- Prioritizes outreach with an explainable **Client Health** score and **Next Action** suggestions.
- Enables quick prototyping and incremental improvements (in-memory store today, Postgres later).
- Includes role-aware workflows (owner/manager/staff) so responsibilities and visibility are clear.
- Provides a modern UI scaffold with production-ready patterns (typed API clients, modular components, and a tokenized design system).

## Key features
- Client portfolio with health score and suggested next action
- Activity feed with scheduling and status tracking
- Archiving and filtered views for active/archived clients
- Team management and role-based access control (RBAC)
- Lightweight persistence (JSON file store for development) and clear paths to Postgres
- Heuristic endpoints for quick signals (e.g., `/api/clients/:id/next-action`, `/api/clients/:id/health`)

## Tech stack
- Frontend: Vite, React, TypeScript, modern CSS (design tokens + components)
- Backend: Node.js, Express, TypeScript, JWT authentication
- Persistence (dev): in-memory / JSON file store (easy to replace with Postgres)
- Query layer: small server-side and client-side query helpers (supports filtering, pagination and search)
- Optional libs & infra: Three.js for visual enhancements (bubble button), charts and utilities; Docker for local development and containerized deployments

## Quick start (development)
1. Install dependencies
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
2. Start the backend server
   - `cd backend && npm run dev`
3. Start the frontend
   - `cd frontend && npm run dev`

Open `http://localhost:3000` (or the port printed by Vite) and log in using one of the seeded users in `backend/data/users.json`.

## Extending the scaffold
- Replace the JSON persistence with Postgres: update `backend/src/store/persistence.ts` and migrate seeds in `data/`.
- Harden RBAC and role promotion flows for production (current role model is explicit and test-friendly).
- Add integration tests and CI to validate RBAC and core feature surfaces.

---

If you'd like, I can also add a short "How to contribute" section or a quick commands cheat-sheet for common developer tasks (seed reset, run tests, build).
# Proyect-8--Vertex
