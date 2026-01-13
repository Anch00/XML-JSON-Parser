@echo off
setlocal
cd /d "%~dp0\backend"
echo Starting backend (RabbitMQ-only)...
node index.js
endlocal
