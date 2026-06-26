<div align="center">
  <img src="attached_assets/logo.png" alt="brOS Logo" width="200" />
  <h1>brOS</h1>
  <p><strong>Advanced Repository Intelligence & Architecture Mapping System</strong></p>
</div>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg" />
  <img alt="Node.js Version" src="https://img.shields.io/badge/Node.js-v20%2B-green.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9.3-blue.svg" />
  <img alt="React" src="https://img.shields.io/badge/React-18-cyan.svg" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Ready-blue.svg" />
</p>

---

## 🚀 Overview

**brOS** (Brain Operating System) is a powerful, full-stack intelligence platform that analyzes GitHub repositories and automatically generates deep, structural insights. By merely pasting a GitHub URL, brOS orchestrates a suite of intelligent analyzers to scan the codebase and extract comprehensive data regarding system architecture, dependencies, API surface areas, and security profiles.

It allows developers to map, understand, and visualize massive scale codebases in seconds.

## ✨ Features

- **Automated Repository Ingestion:** Seamlessly fetch and index codebases directly from GitHub.
- **Dependency Mapping:** Recursively analyzes `package.json`, `requirements.txt`, and other package manifests (handling up to 200 files per repo) to construct a complete graph of external, internal, and peer dependencies.
- **Architecture Visualization:** Identifies architectural patterns (Monolith, Microservices, Event-Driven, etc.) and visualizes system boundaries and components.
- **API Inventory:** Scans and categorizes available APIs (REST, GraphQL, WebSockets) mapping out the interaction surfaces of the target codebase.
- **Live System Command Center:** Interactive, highly-aesthetic React-based dashboard featuring dark-mode and dynamic terminal-style components.
- **Scalable Architecture:** A perfectly isolated `pnpm` monorepo design, separating the React client, Express API server, Database, and shared type definitions (`zod`).

## 🛠️ Technology Stack

brOS leverages a modern, highly-typed stack designed for speed and reliability:

### Frontend
- **Framework:** React 18 (via Vite)
- **Styling:** TailwindCSS + Custom aesthetic CSS for a terminal-themed UI
- **Routing:** Wouter
- **Data Fetching:** React Query (`@tanstack/react-query`)

### Backend
- **Server:** Node.js + Express v5
- **Language:** TypeScript
- **Validation:** Zod

### Database & ORM
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (`drizzle-kit`)

### Infrastructure
- **Package Manager:** `pnpm` (Monorepo Workspaces)
- **Containerization:** Multi-stage Docker
- **Hosting:** Render (Ready-to-deploy)

---

## 📂 Project Structure

brOS is structured as a `pnpm` monorepo containing multiple distinct packages:

```text
.
├── artifacts/
│   ├── bros/                 # Frontend React Application (Vite)
│   └── api-server/           # Backend Express API Server
├── lib/
│   ├── api-zod/              # Shared Zod schemas & auto-generated API types
│   ├── db/                   # Database schemas and Drizzle configuration
│   ├── api-spec/             # OpenAPI Specifications
│   └── api-client-react/     # Auto-generated React Query hooks
├── scripts/                  # Development utility scripts
└── Dockerfile                # Multi-stage production container
```

## 💻 Local Development

### Prerequisites
- Node.js (v20 or higher)
- `pnpm` v9+
- PostgreSQL database (local or cloud)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/bros-app.git
cd bros-app

# Install dependencies across all monorepo workspaces
pnpm install
```

### 2. Environment Setup
Configure your environment variables. The API server needs access to your Postgres database and optionally a GitHub Token to bypass public API rate limits.

```bash
# Export the database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/bros_db"

# (Optional but recommended) Export GitHub Token for deeper analysis
export GITHUB_TOKEN="ghp_your_token_here"
```

### 3. Database Migration
Run Drizzle to push the database schema to your Postgres instance:
```bash
cd lib/db
npx drizzle-kit push
cd ../..
```

### 4. Start the Application
Run the entire stack in development mode:
```bash
pnpm run dev
```
- The frontend will be available at `http://localhost:5173`
- The backend API will be available at `http://localhost:5001`

---

## 🐳 Production Deployment (Docker)

brOS includes a production-ready, highly optimized multi-stage `Dockerfile`. The Dockerfile builds both the frontend and backend, serving the compiled static React files directly through the Express server on a single unified port.

1. **Build the Image**
   ```bash
   docker build -t bros-app .
   ```

2. **Run the Container**
   ```bash
   docker run -p 5001:5001 \
     -e DATABASE_URL="your_production_db_url" \
     -e GITHUB_TOKEN="your_production_github_token" \
     bros-app
   ```

## 📝 License
This project is licensed under the MIT License.
