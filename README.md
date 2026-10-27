# ResQGrid — Disaster Response Coordination Platform

A resilient, backend-focused disaster response platform and real-time coordination engine built for field responders, emergency coordinators, and community relief efforts.

---

## Table of Contents
1. [Submission Checklist (Santrionn Technologies)](#submission-checklist-santrionn-technologies)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Setup & Installation Instructions](#setup--installation-instructions)
5. [Environment Configuration](#environment-configuration)
6. [Database Seeding](#database-seeding)
7. [Running the Application](#running-the-application)
8. [Running Tests](#running-tests)
9. [API Documentation & Postman Collection](#api-documentation--postman-collection)
10. [Key Technical Decisions](#key-technical-decisions)
11. [Assumptions Made](#assumptions-made)
12. [Trade-offs Considered](#trade-offs-considered)
13. [Known Limitations & Areas for Future Improvement](#known-limitations--areas-for-future-improvement)
14. [AI-Assisted Development Documentation](#ai-assisted-development-documentation)

---

## Submission Checklist (Santrionn Technologies)

| Requirement from Tanmay Bansal | Implementation Location | Verification Status |
| :--- | :--- | :--- |
| **GitHub repository containing implementation** | Git initialized locally with clean `.gitignore` | ✅ Ready to push |
| **Setup & installation instructions** | Documented in Section 4 & 5 | ✅ Verified |
| **Architecture overview** | Section 3 with ASCII Architecture diagram | ✅ Verified |
| **Key technical decisions** | Section 10 (Database, Geocoding, Caching, Fallbacks) | ✅ Verified |
| **Assumptions made** | Section 11 | ✅ Verified |
| **Trade-offs considered** | Section 12 | ✅ Verified |
| **Known limitations or areas for future improvement** | Section 13 | ✅ Verified |
| **`.env.example` without committed secrets** | Root `.env.example` | ✅ Verified |
| **API documentation / Postman collection** | [`postman_collection.json`](file:///c:/Users/Dell/Desktop/ResQGrid/postman_collection.json) | ✅ Verified |
| **Live demo / client** | Real-time operations console served at `http://localhost:5000/` | ✅ Verified |
| **AI-Assisted Development documentation** | Section 14 detailing tools, human decisions, and reviews | ✅ Verified |

---

## Tech Stack
- **Language & Runtime**: Node.js (v22 / v20 / v18)
- **Framework**: Express.js
- **Database & ODM**: MongoDB & Mongoose
- **Geospatial Engine**: MongoDB native `2dsphere` index (GeoJSON `Point` format)
- **Real-Time Push**: Socket.IO
- **Security & Identity**: JSON Web Tokens (JWT) & Bcrypt password hashing
- **Testing**: Node.js native test runner (`node:test`) & Supertest

---

## Architecture Overview

```
                               ┌─────────────────────────────────────────────────────────────┐
                               │                    Client Applications                      │
                               │  (Postman / Web Dashboard / Mobile Client / Dispatch Hub)   │
                               └──────────────┬──────────────────────────────▲───────────────┘
                                              │ HTTP Requests                │ Socket.IO Events
                                              ▼                              │
┌─────────────────────────────────────────────┴──────────────────────────────┴───────────────┐
│                                     Express API Server                                     │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: JWT Verification, Role Guard (RBAC), Input Validation, Error Handling   │  │
│  └──────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                             ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Controllers: DisasterController, ResourceController, CommunityReportController...   │  │
│  └──────┬───────────────────────────────────┬───────────────────────────────────┬───────┘  │
│         │                                   │                                   │          │
│         ▼                                   ▼                                   ▼          │
│  ┌──────────────┐                   ┌──────────────┐                    ┌────────────────┐ │
│  │ Location     │                   │ In-Memory    │                    │ Socket.IO      │ │
│  │ Resolver     │                   │ TTL Cache    │                    │ Dispatch Hub   │ │
│  │ (Dictionary  │                   └───────┬──────┘                    └────────────────┘ │
│  │  + Extractor)│                           │ (Miss)                                       │
│  └──────────────┘                           ▼                                              │
│                                     ┌──────────────┐                                       │
│                                     │ Mock Social  │                                       │
│                                     │ Feed Service │                                       │
│                                     └──────────────┘                                       │
└─────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      MongoDB Engine                                        │
│  - Users Collection (hashed passwords, role indexing)                                      │
│  - Disasters Collection (GeoJSON points, sparse 2dsphere index, tags)                       │
│  - Resources Collection (GeoJSON points, 2dsphere proximity index)                         │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Setup & Installation Instructions

### Prerequisites
- Node.js installed (v18.x, v20.x, or v22.x)
- MongoDB instance running locally (default: `127.0.0.1:27017`) or via Docker:
  ```bash
  docker run -d -p 27017:27017 --name mongo-resqgrid mongo:latest
  ```

### 1. Install Dependencies
```bash
npm install
```

---

## Environment Configuration

Copy the template environment configuration:
```bash
cp .env.example .env
```

Default variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/resqgrid
JWT_SECRET=supersecret_jwt_key_resqgrid_change_in_production
JWT_EXPIRES_IN=7d
CACHE_TTL_SECONDS=60
```
*(No real credentials or API secrets are committed).*

---

## Database Seeding

Populate the database with pre-configured operational data (admin, contributors, disasters, and geospatial emergency resources):

```bash
npm run seed
```

### Pre-seeded Accounts:
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@resqgrid.org` | `AdminPass123!` | Full authority: manage all disasters, edit roles, delete contributors |
| **Contributor** | `alice@resqgrid.org` | `ContribPass123!` | Report disasters, manage only own records |
| **Contributor** | `bob@resqgrid.org` | `ContribPass123!` | Report disasters, manage only own records |
| **Public Viewer** | *Unauthenticated* | *N/A* | Read-only access to disasters, nearby resources, and community reports |

---

## Running the Application

### Start API Server
```bash
npm start
```
Or with auto-restart during development:
```bash
npm run dev
```

The application exposes:
- **REST API Base**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Real-Time Web Console**: `http://localhost:5000/` (opens an interactive dashboard streaming live Socket.IO events)

---

## Running Tests

ResQGrid includes an automated integration test suite covering all core requirements:

```bash
npm test
```

### Verified Test Cases:
1. **Authentication & Authorization**: Registration, login, JWT validation, and RBAC enforcement (admin route `/users` blocks contributors with `403 Forbidden`).
2. **Disaster Management & Location Extraction**: Creating disasters, extracting `"Manhattan, NYC"` from text, unresolved handling, tag filtering (`?tag=flood`), and ownership isolation (Bob cannot `PATCH` Alice's disaster -> `403 Forbidden`).
3. **Nearby Resources & Geospatial Proximity**: Proximity query with MongoDB `$near` 2dsphere index (`GET /disasters/:id/resources?radius=2`), radius validation, and query coordinate overrides (`?lat=<lat>&lng=<lng>&radius=<km>`).
4. **Community Reports, Caching & Resilience**: First call fetches live (`source: 'live'`), second call serves from cache (`source: 'cache'`), and simulated external failure gracefully degrades (`source: 'fallback'`) without crashing.
5. **Real-Time Socket.IO Synchronization**: Active WebSocket client receives `disaster_created` broadcast strictly after database persistence succeeds.

---

## API Documentation & Postman Collection

Import [`postman_collection.json`](file:///c:/Users/Dell/Desktop/ResQGrid/postman_collection.json) directly into Postman.

### Core Endpoints:

#### 1. Disasters (`/disasters`)
- `POST /disasters` — Create disaster (Bearer token required). Automatically resolves location from `description` or explicit input.
- `GET /disasters` — List disasters (Public). Supports `?tag=flood&status=active`.
- `GET /disasters/:id` — Get disaster details (Public).
- `PATCH /disasters/:id` — Partially update disaster (Owner or Admin only).
- `PUT /disasters/:id` — Update disaster (Owner or Admin only).
- `DELETE /disasters/:id` — Delete disaster (Owner or Admin only).
- `GET /disasters/:id/resources?radius=2` — Find resources within radius (km). Supports `?lat=<lat>&lng=<lng>&radius=<km>`.
- `GET /disasters/:id/reports` — Retrieve cached community social reports for disaster tags.

#### 2. Resources (`/resources`)
- `GET /resources` — List all emergency resources (filter: `?type=hospital&status=available`).
- `POST /resources` — Register emergency resource (`shelter`, `hospital`, `food`, `water`, `rescue`) with GeoJSON coordinates.

#### 3. Authentication (`/auth`)
- `POST /auth/register` — Register new contributor.
- `POST /auth/login` — Login with email/password; returns JWT.
- `GET /auth/me` — Get profile of authenticated user.

#### 4. Administration (`/users`)
- `GET /users` — List registered users (Admin only).
- `PUT /users/:id/role` — Modify role to `admin` or `contributor` (Admin only).
- `DELETE /users/:id` — Remove user account (Admin only).

---

## Key Technical Decisions

### 1. Why MongoDB was Chosen
- **Native Geospatial Engine**: MongoDB provides native `2dsphere` indexes that perform spherical trigonometry on the WGS84 Earth datum. The `$near` operator automatically calculates distance and sorts results from closest to furthest directly within the database engine.
- **Document Model for Dynamic Incidents**: Disaster incidents have varying structures (some locations have resolved GPS coordinates, others only have raw text notes; tags vary dynamically). MongoDB's flexible schema accommodates this without table migrations or complex relational joins.

### 2. Location Resolution from Description
- **Requirement 2 Alignment**: If a contributor submits:
  ```json
  {
    "title": "Severe Flash Flooding",
    "description": "Heavy flooding has affected Manhattan, NYC following torrential rainfall."
  }
  ```
  The resolver scans the description, detects `"Manhattan, NYC"`, and assigns:
  ```json
  "location": {
    "name": "Manhattan, NYC",
    "resolved": true,
    "coordinates": { "type": "Point", "coordinates": [-73.9712, 40.7831] }
  }
  ```
- **Explicit Unresolved Handling**: In disaster response, hallucinating coordinates can misdirect emergency teams. When an unknown location is reported (`"Uncharted Canyon Sector 99"`), the system stores `resolved: false` and `coordinates: null`.

### 3. Geospatial Proximity (`2dsphere`)
- **GeoJSON Standard**: Coordinates are strictly formatted as `[longitude, latitude]` per GeoJSON and MongoDB requirements.
- **Query Execution**:
  ```javascript
  Resource.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  });
  ```
- Each returned resource is annotated with an exact `distanceKm` calculated via the Haversine formula.

### 4. Community Reports & In-Memory TTL Caching
- **Cache Strategy**: Lightweight in-memory Map cache (`MemoryCache`) tracking `{ value, expiresAt }`.
- **Flow**:
  1. Incoming request checks cache for key `community_reports:disaster_<id>`.
  2. **Cache Hit**: returns `{ source: 'cache', data: [...] }`.
  3. **Cache Miss**: fetches external provider data, stores in cache with 60s TTL, and returns `{ source: 'live', data: [...] }`.

### 5. External API Failure Handling & Resilience
- **Safe Degradation**: If the external social-media service is unreachable (simulating a 503 error), the controller catches the error gracefully.
- Instead of returning a 500 server crash, it returns HTTP 200 with:
  ```json
  {
    "source": "fallback",
    "data": [],
    "warning": "External community report provider failed. Showing graceful fallback.",
    "error": "..."
  }
  ```

### 6. Post-Persistence Real-Time Updates
- Socket.IO broadcasts (`disaster_created`, `disaster_updated`, `disaster_deleted`) are emitted **strictly after** the database write resolves successfully (`await disaster.save()`). If database validation fails, no false broadcast is transmitted to dispatchers.

### 7. Identity & Security Trust Boundary
- The API **never trusts** client-provided creator IDs. The `created_by` field is always extracted from the verified JWT payload (`req.user._id`).

---

## Assumptions Made

1. **Coordinate System**: Distances are calculated assuming an Earth radius of 6,371 km using spherical geometries (`2dsphere`).
2. **Radius Query Defaults**: When `radius` is omitted in proximity queries, the system defaults to a sensible 5 km radius.
3. **Reference Dictionary Scope**: For the take-home scope, known disaster operational zones include Manhattan NYC, Brooklyn NYC, Queens NYC, Downtown Sector 4, North Harbor, and River Valley.
4. **Community Reports**: Community reports represent unverified citizen alerts (e.g. social feeds or SMS hotlines) and are normalized with urgency levels (`critical`, `high`, `medium`).

---

## Trade-offs Considered

1. **In-Memory Cache vs. Redis**:
   - *Consideration*: Redis is industry-standard for distributed systems.
   - *Decision*: An in-memory cache was selected to ensure the assignment runs out of the box with `npm install && npm start` without requiring Redis container setups.
2. **Deterministic Seeded Geocoder vs. Paid Geocoding APIs**:
   - *Consideration*: Google Maps Geocoding API or Mapbox.
   - *Decision*: A seeded deterministic geocoder was implemented to eliminate the need for paid API keys, network flakiness during evaluation, or third-party rate limits.
3. **Single Node Socket.IO vs. Redis Pub/Sub**:
   - *Consideration*: Clustering Socket.IO across multiple Node instances.
   - *Decision*: In-process Socket.IO keeps architecture simple and transparent for evaluation.

---

## Known Limitations & Areas for Future Improvement

1. **Distributed Caching**: In a clustered production environment behind a load balancer (e.g. AWS ECS / Kubernetes), the in-memory cache should be backed by Redis.
2. **External Geocoding Fallback**: Integrate OpenStreetMap Nominatim API for global geocoding, using the seeded dictionary as a zero-latency fallback during network blackouts.
3. **Socket.IO Cluster Adapter**: Add `@socket.io/redis-adapter` for horizontal multi-instance WebSocket scaling.
4. **Automated Report Clustering**: Implement NLP-based deduplication to group similar citizen alerts into single incident clusters.

---

## AI-Assisted Development Documentation

In accordance with Santrionn Technologies' assignment guidelines:

- **AI Tools Used**: Google Antigravity (powered by Gemini 3.8 Flash).
- **What AI Helped With**:
  - Initial scaffolding of Express routes and Mongoose schemas.
  - Generating initial seed JSON datasets for NYC disaster scenarios.
  - Drafting mathematical Haversine distance helper functions.
- **What Was Personally Designed, Reviewed, Modified, and Validated**:
  - **Architecture & Layering**: Designed the clean boundary between middleware, controllers, services, and models.
  - **Security Rules**: Designed the creator derivation rule (ignoring client-supplied `created_by` and enforcing JWT claims).
  - **Location Resolution Logic**: Handled the edge case where unrecognized locations must explicitly return `resolved: false` and `coordinates: null` rather than hallucinating coordinates.
  - **Test Suite Optimization**: Debugged Node 22 driver socket timeouts inside Jest and migrated to native `node:test` integration testing, reducing test runtime from minutes to <16 seconds.
  - **Resilience Design**: Formulated the graceful degradation response pattern for external service failures.
