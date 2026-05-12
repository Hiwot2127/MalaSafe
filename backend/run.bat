@echo off
echo Starting MalaSafe Backend Server...
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run the FastAPI application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
