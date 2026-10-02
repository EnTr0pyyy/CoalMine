# ⛏️ CoalSetu — CMPDI / CIL Intelligence & Ministry of Coal Reporting Platform

> **An automated, AI-assisted platform for geological, mining, and production document processing, dynamic topic extraction, cryptographic audit trails, and parliamentary reporting across Coal India Limited (CIL) subsidiaries and the Ministry of Coal.**

[![Local AI](https://img.shields.io/badge/Local%20AI-Ollama%20gemma3%3A1b-orange.svg)](https://ollama.ai/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-blue.svg)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%2018%2B%20%7C%20Express%20%7C%20Prisma-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma%20ORM-336791.svg)](https://www.postgresql.org/)
[![ML Service](https://img.shields.io/badge/ML-FastAPI%20%7C%20Donut%20DocVQA-3776AB.svg)](https://fastapi.tiangolo.com/)

---

## 🎯 Executive Summary & Context

CMPDI and CIL subsidiaries (**ECL, BCCL, CCL, WCL, SECL, MCL, NCL, CMPDI**) play a central role in providing geological, exploration, and mining figures to the **Ministry of Coal** and responding to high-priority parliamentary inquiries (Lok Sabha & Rajya Sabha). 

Compiling these reports previously relied heavily on manual assembly across scanned PDFs, complex spreadsheets, and physical archives, resulting in:
- High dependence on individual expertise and domain memory
- Delays and latency in generating urgent parliamentary briefs
- Probable manual transcription and calculation errors
- Limited rapid retrieval of insights from historical records

**CoalSetu** provides a local-first digital workspace for governance, document processing, and reporting. Current capabilities include:
- **Tesseract OCR** for full-page and full-document text extraction, with Donut DocVQA for targeted visual field extraction
- **PDF, CSV, and spreadsheet processing**, including Camelot and pdfplumber table extraction paths
- **PDF and editable DOCX report exports** through the ML service
- **PostgreSQL full-text search** across supported governance records
- **Local AI inference** through Ollama, plus an interactive CIL subsidiary dashboard
- **SHA-256-linked audit records** and email notification templates

Accuracy and time-saving percentages are intentionally omitted until measured against a documented benchmark dataset.

### Current Capability Readiness

| Capability | Implementation | Readiness |
|---|---|---|
| OCR and document intelligence | Tesseract OCR routes, Donut field extraction, and language-pack discovery | Integrated; native Tesseract and language packs must be installed on the host |
| Mining table extraction | Camelot lattice/stream paths with pdfplumber fallback | Integrated; results depend on PDF quality and table layout |
| PDF and DOCX report export | WeasyPrint with ReportLab fallback; python-docx for Word | Export endpoints and Reports UI are present |
| Local AI | Ollama with Gemma 3:1b as the default chat model | Requires Ollama and the model to be available locally |
| Full-text search | PostgreSQL tsvector/tsquery and GIN indexes for flags, corrective actions, inspections, and notices | Integrated |
| Email notifications | Nodemailer templates for overdue actions, high-risk flags, inquiry deadlines, and reports | SMTP configuration and automatic event/workflow triggers are still required |
| Subsidiary analytics | Apache ECharts production, target, offtake, and OBR chart | Dashboard currently uses illustrative default values, not live production figures |
| Docker and n8n | Compose definitions for PostgreSQL, Redis, n8n, Backend, and ML | Container deployment and scheduled n8n workflows have not been verified |

---

## 🏗️ System Architecture

```text
                           ┌──────────────────────────────┐
                           │   CoalSetu React Frontend    │
                           │  (Vite + Tailwind CSS :5173) │
                           └──────────────┬───────────────┘
                                          │ REST & Auth (JWT)
                                          ▼
                           ┌──────────────────────────────┐
                           │      Node.js API Server      │
                           │     (Express + Prisma :5000) │
                           └──────┬───────────────┬───────┘
                                  │               │
            Prisma Schema / SQL   │               │ Internal REST / JSON
                                  ▼               ▼
           ┌────────────────────────┐   ┌─────────────────────────────┐
           │  PostgreSQL Database   │   │     FastAPI ML Engine       │
           │ (:5432 / embedded-pg)  │   │  (:8001 / PyTorch + Donut)  │
           └────────────────────────┘   └──────────────┬──────────────┘
                                                       │
                                                       ▼ (Optional)
                                        ┌─────────────────────────────┐
                                        │  Ollama Local LLM (gemma3)  │
                                        │         (:11434)            │
                                        └─────────────────────────────┘
```

---

## 📋 System Prerequisites

Before getting started, ensure the following are installed on your Linux / macOS / Windows (WSL2) machine:

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Node.js** | `v18.x` or `v20.x` | Required for Backend and Frontend (`node -v`) |
| **npm** | `v9.x` or `v10.x` | Node package manager (`npm -v`) |
| **Python** | `3.10` or `3.11` | Required for ML FastAPI engine (`python3 --version`) |
| **Python venv** | Built-in / package | `sudo apt install python3-venv` (Ubuntu/Debian) |
| **PostgreSQL** | `v14+` *(optional)* | Included automatically via `@embedded-postgres` or Docker |
| **Ollama** | Latest *(optional)* | For local offline LLM copilot (`ollama.ai`) |
| **tmux** | Any *(optional)* | Recommended for detached background execution |

---

## 🛠️ Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone <repository_url>
cd Coal_Setu/new
```

---

### 2. Backend & Database Setup
The backend runs on **Node.js (Port 5000)** and automatically manages an embedded or system PostgreSQL database.

```bash
cd Backend

# 1. Install Node dependencies
npm install

# 2. Configure environment file (default development settings already provided)
cp .env.example .env

# 3. Initialize Database & Seed Baseline CIL Data
# (Creates database schema via Prisma and seeds mines, documents, notices, and users)
npm run setup

# Return to root directory
cd ..
```

> **Note**: `npm run setup` initializes the embedded PostgreSQL binaries, pushes the Prisma schema, and populates the database with real production data (773.6 MT, 1,755 M.Cu.m OBR) across all 8 CIL subsidiaries.

---

### 3. Machine Learning (ML) Engine Setup
The ML service runs on **Python FastAPI (Port 8001)** for Donut visual document processing, tabular extraction, and dynamic TF-IDF topic analysis.

```bash
cd ML

# 1. Create a dedicated Python virtual environment
python3 -m venv venv

# 2. Activate virtual environment
# On Linux / macOS:
source venv/bin/activate
# On Windows (cmd / PowerShell):
# venv\Scripts\activate

# 3. Upgrade pip and install required Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Return to root directory
cd ..
```

---

### 4. Frontend Setup
The frontend is a single-page application built with **React 18, Vite, and Tailwind CSS (Port 5173)**.

```bash
cd Frontend

# Install Frontend dependencies
npm install

# Return to root directory
cd ..
```

---

### 5. (Optional) Local Sovereign LLM Setup
If you want to use the local Gemma 3 AI model for interactive conversational copilot capabilities:

```bash
# 1. Install Ollama from https://ollama.ai
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull the offline sovereign model
ollama pull gemma3:1b

# 3. Ensure the Ollama daemon is running
ollama serve
```
*(If Ollama is not installed, the platform automatically defaults to deterministic rule-based and template-assisted engines without failing).*

---

## 🚀 Running the Platform

You can run the entire platform using any of the three methods below:

### Method A: One-Click Startup Script (Recommended)
From the repository root, start the services with the script for your operating system:

```powershell
.\start-all.ps1
```

Add `-NoBrowser` to skip opening the app automatically. On Linux or macOS, use:

```bash
./start-all.sh
```

This single command will:
1. Check Ollama availability
2. Launch the FastAPI ML service on port `8001`
3. Ensure PostgreSQL is running, then launch the Node.js Backend on port `5000`
4. Launch the Vite React Frontend on port `5173`

---

### Method B: Manual Startup in Separate Terminals

#### Terminal 1 — ML Engine:
```bash
cd ML
source venv/bin/activate
export HF_HUB_OFFLINE=1
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001
```

#### Terminal 2 — Node.js Backend:
```bash
cd Backend
node src/index.js
```

#### Terminal 3 — React Frontend:
```bash
cd Frontend
npm run dev
```

---

### Method C: Persistent Background Daemons (`tmux`)
If you are running on a server or remote terminal and want processes to persist after closing the terminal:

```bash
# Start backend in tmux session
tmux new-session -d -s backend "cd Backend && node src/index.js"

# Start ML service in tmux session
tmux new-session -d -s ml "cd ML && export HF_HUB_OFFLINE=1 && source venv/bin/activate && python3 -m uvicorn main:app --host 0.0.0.0 --port 8001"

# Start frontend in tmux session
tmux new-session -d -s frontend "cd Frontend && npm run dev -- --host 0.0.0.0"
```

To monitor logs at any time:
```bash
tmux capture-pane -t backend -p | tail -n 25
tmux capture-pane -t ml -p | tail -n 25
```

---

## 🌐 Application URLs

Once started, access the platform services at:

- **CoalSetu Web Application**: [http://localhost:5173](http://localhost:5173)
- **Platform Capabilities Brief**: [http://localhost:5173/platform](http://localhost:5173/platform)
- **Backend API & Health**: [http://localhost:5000/health](http://localhost:5000/health)
- **ML Service OpenAPI Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🔑 Default Test Credentials

The database comes pre-seeded with designated governance roles:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Corporate Admin** | `admin@coal.gov.in` | `password123` | Full administrative control, all reports, audit logs |
| **Safety & Statutory Inspector** | `inspector@coal.gov.in` | `password123` | Mine inspections, DGMS compliance flags, audits |
| **CMPDI Exploration Geologist** | `geologist@cmpdi.co.in` | `password123` | Borehole analysis, reserve estimation, geological reports |
| **Standard User (Mine Level)** | `user@coal.gov.in` | `password123` | Daily production figures, log viewing |

---

## 🌟 Key Functional Modules

### 1. Automated Report Studio (`/reports`)
- **Templates**:
  - *Monthly Production & Offtake Review*
  - *Geological Reserve & Seam Quality Assessment (CMPDI)*
  - *Ministry of Coal Performance & Parliamentary Synthesis*
  - *Inter-Subsidiary Performance & Efficiency Matrix*
- **Features**: Report generation, baseline manual-time comparisons, and **PDF, DOCX, and print export**.

### 2. Automated Word Cloud & Topic NLP (`/topics`)
- **Dynamic Term Frequency**: Computes term occurrences across available ingested documents, circulars, and notices; fallback content may be used when live source records are unavailable.
- **Source Traceability**: Clicking any keyword reveals the matching document names (e.g. `inspection-report-INS-1023-scan.pdf`), occurrences, and sentence excerpts.
- **Topic Clusters**: Automatic discovery of cross-subsidiary topics (HEMM fleet modernization, coking coal washery yields, FMC rail loading).

### 3. AI Parliamentary Q&A System (`/parliamentary`)
- **Query Solver**: Formatted specifically for Lok Sabha and Rajya Sabha Starred/Unstarred Questions.
- **Traceable Grounding**: References actual statutory archives, CIL subsidiary records, and Ministry gazettes.

### 4. Official Notice Board & Directives (`/notices`)
- Prominently displays high-priority circulars from Ministry of Coal, DGMS, and CMPDI Headquarters with active validity periods and status flags.

### 5. Cryptographic Audit Trail (`/audit-logs`)
- Every report generation, document extraction, and administrative action is chained using **SHA-256 Merkle hashes** with an in-browser verification tool (`/api/audit-logs/verify`).

### 6. Platform Capabilities Brief (`/platform`)
- Presents the service architecture, API ports, integrations, and readiness notes in one view.
- Links to the Document Repository, Reports, AI Copilot, Dashboard, and Settings modules.

### 7. Global Search (`/api/search`)
- PostgreSQL full-text search covers flags, corrective actions, inspections, and notices, with a top-bar search interface.

### 8. Email Notification Templates
- Nodemailer templates are available for overdue corrective actions, critical flags, parliamentary deadlines, and report delivery. Configure SMTP and triggering workflows before relying on delivery.

### 9. Docker and Workflow Automation
- `docker-compose.yml` defines PostgreSQL, Redis, n8n, Backend, and ML services. Container deployment and scheduled n8n workflows require separate setup and verification.

---

## ⚙️ Configuration (.env)

The backend configuration is located at `Backend/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=*

# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coalgov_db?schema=public"

# JWT Authentication
JWT_ACCESS_SECRET="coalgov_super_secret_access_token_key_2026"
JWT_REFRESH_SECRET="coalgov_super_secret_refresh_token_key_2026"
JWT_ACCESS_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# ML Service URL
ML_SERVICE_URL="http://localhost:8001"
```

---

## 🧪 Verification & Health Checks

Test the live services directly using `curl`:

```bash
# 1. Check Backend & DB Health
curl http://localhost:5000/health

# 2. Check ML Service Health
curl http://localhost:8001/docs

# 3. Test Dynamic Word Cloud API
curl -X POST http://localhost:5000/api/analytics/wordcloud \
  -H "Content-Type: application/json" \
  -d '{"maxWords": 10}'

# 4. Run Frontend Production Build Check
cd Frontend && npm run build
```

---

## 🔒 Security & Deployment Notes

> [!IMPORTANT]
> Do not commit `.env` files, credentials, SMTP passwords, or real mine documents. Replace development JWT secrets and database passwords before shared deployment. Configure and test SMTP separately; email templates alone do not confirm delivery. Docker image availability and n8n workflow behavior must be verified in the target environment.
