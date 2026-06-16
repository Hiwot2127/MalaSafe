@echo off
cd frontend
call npx tsc --noEmit
if %errorlevel% equ 0 (
    echo TypeScript compilation: SUCCESS
) else (
    echo TypeScript compilation: FAILED
)
pause
