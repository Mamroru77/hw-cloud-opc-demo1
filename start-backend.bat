@echo off
echo ============================================
echo  CloudVein - Starting Backend (Python 3.12)
echo ============================================
echo.
echo Activating venv and starting FastAPI...
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
