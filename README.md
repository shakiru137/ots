# OTS

---

# 🚨 OTS Backend Technical Documentation

## 📌 Overview
The **OTS (On-The-Spot SOS) Backend System** is a high-availability, real-time emergency response platform designed to handle critical SOS signals with minimal latency. The system prioritizes speed, reliability, and data integrity, ensuring that emergency responders receive accurate and timely information.

---

## 🏗️ System Architecture

### 🔹 Architecture Style
- **Microservices Architecture**
  - Ensures scalability and isolation of critical services
  - Prevents system-wide slowdowns during traffic spikes (e.g., mass SOS triggers)

### 🔹 Core Components
- **API Gateway**
  - Nginx or AWS API Gateway
  - Implements **rate limiting** to prevent DDoS attacks

- **Primary Runtime**
  - Node.js with Fastify
  - Optimized for **high-throughput JSON processing**

- **Real-Time Layer**
  - Redis Stack + Socket.io
  - Enables ultra-fast real-time communication

- **Databases**
  - **PostgreSQL (with PostGIS)**
    - Stores:
      - User profiles
      - NIN verification data
      - Incident logs
  - **Redis**
    - Stores:
      - Active SOS sessions
      - Real-time GPS coordinates

---

## 🆔 NIN Verification & User Onboarding

### 🔹 Providers
- Smile ID  
- VerifyMe Nigeria (Direct NIMC integration)

### 🔹 Verification Flow
1. User submits NIN
2. Backend sends encrypted request:
   ```
   POST /verify/nin
   ```
3. Provider returns:
   - Full name
   - Date of birth
4. Backend validates:
   - Matches returned data with user registration details

### 🔐 Security & Compliance
- Store:
  - Verification ID
  - Hashed NIN only
- **Never store raw NIN**
- Must comply with:
  - NDPR
  - GDPR

---

## 🚨 SOS Engine (High-Frequency Processing)

When an SOS is triggered, the system enters **“War Room Mode”**.

---

### 📍 A. Coordinate Ingestion (1-Second Interval)

- **Protocol**
  - WebSockets (Socket.io)

- **Processing Logic**
  1. Each 1-second GPS ping:
     - Stored in Redis using `GEOADD`
     - Enables sub-millisecond retrieval

  2. Every 30 seconds:
     - Batch-write movement data to PostgreSQL
     - Used for incident reporting and audit trails

- **Key Principle**
  > PostgreSQL is for history, Redis is for real-time.

---

### 🎥 B. Live Stream Handling (Agora Integration)

- Backend generates **Agora RTC Token**
- Enables real-time video/audio streaming

#### 🔹 Recording Strategy
- Use **Agora Cloud Recording**
- Store recordings directly in AWS S3

#### 🔐 Storage Rules
- Use **WORM (Write Once, Read Many)** bucket
- Prevents tampering with evidence

---

## 👨‍👩‍👧 SOS Routing Logic

### 🔹 Personal SOS
- Fetch emergency contacts from PostgreSQL
- Send alerts via:
  - Firebase Cloud Messaging (FCM)
  - SMS fallback (Termii / Twilio)

---

### 🔹 Third-Party SOS
- Skip family notifications
- Route directly to:
  - Nearest Government Responder Hub
- Based on:
  - Real-time GPS location

---

## 💰 Service Stack & Estimated Costs

| Component       | Service Provider       | Purpose                          | Estimated Cost |
|----------------|----------------------|----------------------------------|----------------|
| Compute        | AWS EC2 (t3.medium)  | Backend hosting & scaling        | $40 – $120     |
| Identity       | Smile ID             | NIN verification                 | ₦200/user      |
| Real-Time      | Redis Cloud          | GPS + session state              | $30 – $100     |
| Database       | AWS RDS (Postgres)   | Persistent storage + PostGIS     | $50 – $150     |
| Streaming      | Agora.io             | Video/audio streaming            | $0.99 / 1k mins|
| SMS            | Termii               | Emergency fallback messaging     | ₦4.50 / SMS    |

---

## 🛡️ Critical Backend Safety Features

### 🔹 1. Heartbeat Monitor
- Detects socket disconnection during SOS
- Triggers:
  ```
  SIGNAL_LOST
  ```
- Sends:
  - Last Known Location to responders

---

### 🔹 2. Idempotency Protection
- Prevents duplicate emergency cases

#### 🔑 Strategy
- Use idempotency key:
  ```
  UID + Timestamp (minute)
  ```
- Ensures:
  - One incident per SOS trigger window

---

### 🔹 3. JWT Security Model
- Short-lived Access Tokens:
  - 15 minutes
- Refresh Tokens for re-authentication

#### 🚨 Emergency Exception
- **Safety Bypass Mechanism**
  - Keeps SOS session alive even if token expires

---

## ⚡ Performance Philosophy

> “The database is for history; Redis is for the now.”

- Every millisecond saved = closer response distance
- System must target:
  - **99.99% uptime**
- 99% uptime is not acceptable for life-critical systems

---

## 📌 Key Takeaways for Developers

- Prioritize **real-time performance over storage consistency during emergencies**
- Use Redis aggressively for:
  - Active sessions
  - Location tracking
- Batch persistence to PostgreSQL
- Design every component for:
  - Fault tolerance
  - Low latency
  - High concurrency

---


---

# OTS Project - Setup & Execution Guide

This document outlines the steps to set up the environment, handle Docker permissions, and run the OTS application services.

## 🛠 Prerequisites

* **Node.js** (v18+ recommended)
* **Docker** & **Docker Compose**
* **PostgreSQL / PostGIS** (Managed via Docker)
* **Redis Stack** (Managed via Docker)

---

## 🚀 Getting Started

### 1. Fix Docker Permissions (Linux/WSL)
If you encounter `Permission denied` when running Docker commands, you must grant your user the necessary rights.

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply group changes immediately (avoids logout/login)
newgrp docker

# Verify docker is accessible
docker ps
```

### 2. Infrastructure Setup (Database & Redis)
The project relies on Docker for its database and cache.

**Option A: Running in the background (Recommended)**
This keeps your terminal free for the next steps.
```bash
docker-compose up --build -d
```

**Option B: Running with live logs**
If you run this, **you must open a second terminal tab/window** to run the application commands.
```bash
docker-compose up --build
```

### 3. Database Migrations & Seeding
Once the containers are up and the database is ready to accept connections (check logs for `database system is ready`):

```bash
# Run latest migrations
npx knex migrate:latest

# Run seed data
npx knex seed:run
```

### 4. Running the Application
Ensure you are in the project root directory.

```bash
# Start the development server
npm run dev
```

The server should start at `http://127.0.0.1:3000`.

---

## 🔍 Troubleshooting

### `ECONNREFUSED 127.0.0.1:5432`
If the app crashes with this error:
1. **Check Docker Status:** Ensure the Postgres container is actually running (`docker ps`).
2. **Wait for Init:** Postgres takes a few seconds to initialize PostGIS extensions on the first boot. Wait for the "ready to accept connections" log.
3. **Port Conflicts:** Ensure you don't have a local PostgreSQL service running on your host machine that is hogging port 5432.

### Zombie Processes
If you see errors about the port being in use or weird connection issues, clear out old Node processes:
```bash
pkill node
```

---

## 📁 Project Summary
* **Postgres:** Port 5432
* **Redis:** Port 6379
* **API:** Port 3000

---

I added the `-d` (detached) flag to the main command since it's usually easier than managing two terminal windows. Does the application connect to the DB now, or are you still seeing that `ECONNREFUSED` error?
