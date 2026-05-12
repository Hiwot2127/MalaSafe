@echo off
echo ========================================
echo MalaSafe Backend Setup Script
echo ========================================
echo.

echo Step 1: Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo Error: Failed to create virtual environment
    exit /b 1
)
echo Virtual environment created successfully!
echo.

echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat
echo.

echo Step 3: Upgrading pip...
python -m pip install --upgrade pip
echo.

echo Step 4: Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo Step 5: Creating required directories...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "models" mkdir models
echo Directories created successfully!
echo.

echo Step 6: Setting up environment file...
if not exist ".env" (
    copy .env.example .env
    echo .env file created from .env.example
    echo IMPORTANT: Please edit .env file with your configuration!
) else (
    echo .env file already exists, skipping...
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with your database credentials and secret key
echo 2. Create PostgreSQL database: createdb malasafe_db
echo 3. Run migrations: alembic upgrade head
echo 4. Start the server: uvicorn app.main:app --reload
echo.
echo For more information, see README.md
echo.
pause
