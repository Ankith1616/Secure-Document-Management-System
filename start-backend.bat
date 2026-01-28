@echo off
echo ============================================
echo CEDMS - Starting Backend Server
echo ============================================
echo.
cd backend
echo Installing dependencies...
call npm install
echo.
echo Starting server on http://localhost:5000
echo.
call npm start
