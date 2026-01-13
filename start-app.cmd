@echo off
setlocal
cd /d "%~dp0"

echo(=== RabbitMQ setup (required) ===

REM Verify RabbitMQ CLI exists
where rabbitmq-server >nul 2>&1
if errorlevel 1 goto NO_RMQ

REM Check admin rights (required for service control)
net session >nul 2>&1
if errorlevel 1 echo [WARN] Not running as Administrator. Service operations may fail.

REM Enable management plugin (idempotent)
echo Enabling RabbitMQ management plugin...
rabbitmq-plugins enable rabbitmq_management >nul 2>&1

REM Ensure service is installed
sc query RabbitMQ >nul 2>&1
if errorlevel 1 (
	echo Installing RabbitMQ Windows service...
	rabbitmq-service install >nul 2>&1
)

REM Start service (idempotent)
echo Starting RabbitMQ service...
rabbitmq-service start >nul 2>&1
if errorlevel 1 net start RabbitMQ >nul 2>&1

REM Wait for AMQP port 5672 to be reachable (max 30s)
echo Waiting for RabbitMQ on localhost:5672 (max 30s)...
powershell -NoProfile -Command "& { $t=Get-Date; while(-not (Test-NetConnection -ComputerName localhost -Port 5672 -InformationLevel Quiet)) { if((Get-Date)-$t -gt [TimeSpan]'0:00:30'){ exit 1 }; Start-Sleep -Seconds 1 }; exit 0 }" >nul 2>&1
if errorlevel 1 (
	echo [WARN] Could not verify RabbitMQ on port 5672 within 30s.
) else (
	echo RabbitMQ is up.
)

echo Management UI: http://localhost:15672  (user: guest / pass: guest)
goto AFTER_RMQ

:NO_RMQ
echo [ERROR] RabbitMQ is not installed or not in PATH.
echo         Install with (Admin PowerShell):
echo         choco install erlang -y
echo         choco install rabbitmq -y
echo         Then re-run this script as Administrator.

:AFTER_RMQ
echo(=== Frontend ===
echo Starting frontend (Vite dev server) in a new window...
start "Frontend" cmd /k "cd /d ""%~dp0\frontend"" && npm run dev"

echo Done. Frontend: http://localhost:5173
endlocal
