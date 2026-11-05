# Real-Time Fleet Tracking & Geofencing System

An end-to-end, high-frequency fleet telematics platform built with Node.js, RabbitMQ, MongoDB, Socket.IO, and Flutter. The system simulates telemetry generation, ingests and processes time-series geospatial data, evaluates real-time geofence events, and streams live movement and historical trip playback to cross-platform client applications.

---

## Key Features

- **Real-Time Telemetry Ingestion**: High-throughput message queuing via RabbitMQ with publisher confirms, reconnect strategies, and dead-letter queueing (DLQ) for invalid payloads.
- **Geospatial Processing & Geofencing**: Real-time evaluation of circular and polygonal geofence boundaries (enter/leave detection) using stateful transition tracking to prevent false event triggers.
- **Live Streaming & WebSockets**: Low-latency vehicle position updates and geofence alerts pushed via Socket.IO.
- **Historical Trip Playback**: RESTful API for querying time-series location data (up to 24-hour ranges) with route scrubbing, variable speed playback, and stop markers.
- **Cross-Platform Client**: Built with Flutter for Web and Mobile targeting Google Maps integration with smooth marker interpolation and follow-mode camera controls.

---

## Architecture Overview

```
[ Device Simulator ]
        │
        │ (AMQP / Telemetry Stream)
        ▼
   [ RabbitMQ ] ──(DLQ)──► [ Invalid Payload Queue ]
        │
        │ (Consume & Validate)
        ▼
 [ Tracker Service ]
        ├───► [ MongoDB ] (Time-series data & Device State)
        └───► [ Socket.IO Server ] ──► [ Flutter Client (Web/Mobile) ]
```

### Architectural Principles
- **Decoupled Producers**: The simulator operates independently of storage and client layers, publishing strictly to the message broker.
- **Single Writer Pattern**: The Tracker Service is the sole process responsible for persisting state to MongoDB and servicing client WebSocket connections.
- **Data Validation**: Strict runtime schema validation using Zod before data persistence or event evaluation.

---

## Repository Structure

Monorepo architecture managed with standard package tooling:

```text
.
├── apps/
│   ├── simulator/        # Multi-device GPS route simulation service
│   ├── tracker-service/  # Ingestion, geofencing logic, HTTP & WebSocket API
│   └── client/           # Flutter application (Web & Mobile)
├── packages/
│   └── shared/           # Common types, geospatial utils, and Zod schemas
├── docker-compose.yml    # Infrastructure orchestration (RabbitMQ, MongoDB, Backends)
└── README.md
```

---

## Tech Stack

- **Backend**: Node.js 24 (ES Modules), Express, Socket.IO 4, `amqplib`, `@turf/turf`, Zod, Native MongoDB Driver.
- **Database & Messaging**: MongoDB 7.0 (Geospatial & Time-Series indexes), RabbitMQ 3.12 (AMQP).
- **Client**: Flutter (Web & Mobile), `google_maps_flutter`, `socket_io_client`, `dio`.
- **Infrastructure**: Docker & Docker Compose.

---

## Data Schemas

### Telemetry Payload (AMQP Message)
```json
{
  "messageId": "3f1c2a9e-8b4d-4f7a-9c21-5e6d7a8b9c0d",
  "deviceId": "TRK-0001",
  "imei": "356938035643809",
  "recordedAt": "2026-11-05T09:15:02Z",
  "lat": 30.0444,
  "lng": 31.2357,
  "speed": 48,
  "heading": 135,
  "ignition": true,
  "battery": 87
}
```

### Device Document (MongoDB `devices` collection)
```json
{
  "_id": "TRK-0001",
  "name": "Truck 01",
  "imei": "356938035643809",
  "lastSeenAt": "2026-11-05T09:15:02Z",
  "lastPosition": {
    "type": "Point",
    "coordinates": [31.2357, 30.0444]
  },
  "speed": 48,
  "heading": 135,
  "ignition": true
}
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) v24+
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (for local client development)

### Environment Configuration

Copy the example environment files for each service prior to running the stack:

```bash
cp apps/simulator/.env.example apps/simulator/.env
cp apps/tracker-service/.env.example apps/tracker-service/.env
```

### Running with Docker Compose

To build and launch the database, message broker, simulator, and backend service in detached mode:

```bash
docker compose up --build -d
```

Verify service status:

```bash
docker compose ps
```

- **Tracker Service Health Check**: `http://localhost:3000/health`
- **RabbitMQ Management Console**: `http://localhost:15672` (Default credentials: `guest` / `guest`)

---

## Running the Flutter Client

1. Navigate to the client application directory:
   ```bash
   cd apps/client
   ```

2. Retrieve dependencies:
   ```bash
   flutter pub get
   ```

3. Run on the desired target platform:

   - **Web**:
     ```bash
     flutter run -d chrome
     ```
   - **Mobile (iOS/Android)**:
     ```bash
     flutter run -d <device_id>
     ```

---

## API & Event Specification

### HTTP Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and database connectivity |
| `GET` | `/api/devices` | Returns a list of all devices with their last recorded positions |
| `GET` | `/api/devices/:id/history` | Fetches historical track points (Query params: `from`, `to`, `page`, `limit`) |
| `GET` | `/api/geofences` | Lists all defined geofence zones |
| `POST` | `/api/geofences` | Creates a circular or polygonal geofence zone |
| `GET` | `/api/geofences/events` | Retrieves enter/leave alert log history |

### Socket.IO Events

#### Client Listens
- `telemetry:update`: Broadcasts real-time position updates for active devices.
- `geofence:alert`: Broadcasts live enter/leave transition events.

---

## Testing

Run unit and integration tests across backend modules:

```bash
# Run all backend tests
npm test --workspaces

# Run geofence state evaluation tests specifically
npm test --workspace=apps/tracker-service geofence.test.js
```

---

## Definition of Done Verification

- [x] All core services spin up via single `docker compose up` command.
- [x] Real-time vehicle location streaming verified end-to-end.
- [x] Historical route playback with scrubbing timeline active.
- [x] Geofence boundary enter/leave detection tested with zero duplicate event triggers.
- [x] Flutter client operational across web and mobile viewports.