# Port Pass Issuing Management System

Production-oriented web application for issuing and tracking visitor passes across secured port zones.

## Tech Stack
- Frontend: React + Vite + Material UI + Zustand + React Hook Form
- Backend: FastAPI + SQLAlchemy + JWT auth
- Database: SQLite (dev) and PostgreSQL-compatible ORM model

## Quick Start
### 1) Backend setup
```bash
cd backend
# Install Python 3.11+ first if `python`/`py` is not available on your machine.
# On Windows PowerShell, prefer the Python launcher so you avoid PATH/shim issues.
py -3 -m venv .venv
# If you already created a partial .venv, delete it first and rerun the command.
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

If venv creation stops while bootstrapping `pip` or `ensurepip`, remove the partial `backend/.venv` folder and recreate it. If PowerShell reports that Python is not found, install Python from https://www.python.org/downloads/ and make sure the installer adds Python to PATH. You may also need to disable the Windows App Execution Alias for Python in Windows settings.

### 2) Frontend setup
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```



## Features
- Pass issuing form with real-time NIC/phone validation
- Dashboard summary and zone-wise chart
- Searchable/filterable/sortable pass table with pagination
- One-click checkout to mark received time
- CSV export
- Print pass
- Dark mode toggle
- Audit logging (login, issue, checkout)

## API Base
- Backend default: `http://localhost:8000`
- Frontend default API: `http://localhost:8000/api`


admin / Admin@123
ops_officer / OpOfficer@123
pass_officer / PassOfficer@123
gate_officer / GateOfficer@123


http://localhost:5173/visitor-request
http://localhost:5173/operations/approvals
http://localhost:5173/pass/generation