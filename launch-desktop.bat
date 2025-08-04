@echo off
echo ================================================
echo  INVENTORY CONTROL SYSTEM - DESKTOP APPLICATION
echo ================================================

echo.
echo [1/3] Starting Next.js development server...
start /B npm run dev

echo.
echo [2/3] Starting Python backend...
timeout /t 3 /nobreak >nul
start /B python backend/main.py

echo.
echo [3/3] Launching desktop application window...
echo (DO NOT OPEN BROWSER - Desktop window will appear)
timeout /t 5 /nobreak >nul
npx electron .

echo.
echo Desktop application window should now be open!
echo (If you see a browser, close it - use the desktop window instead)
pause