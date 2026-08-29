@echo off
echo ========================================================
echo Starting Port Pass Management System (Backend + Frontend)
echo ========================================================
start "Port Pass - Backend (FastAPI)" cmd /c "%~dp0start_backend.bat"
timeout /t 2 >nul
start "Port Pass - Frontend (Vite)" cmd /c "%~dp0start_frontend.bat"
echo Both services launched in separate windows!
echo Backend:  http://127.0.0.1:8000 (API docs: http://127.0.0.1:8000/docs)
echo Frontend: http://localhost:5173
pause
