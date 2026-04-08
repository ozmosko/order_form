@echo off
cd /d "%~dp0"
copy /y deploy\config.js admin\config.js
echo config.js synced from deploy\ to admin\
pause
