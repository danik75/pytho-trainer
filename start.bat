@echo off
rem Sets up (if needed) and starts Pytho Trainer: installs dependencies,
rem builds the sandbox Docker image, makes sure an .env file exists, then
rem runs the backend and frontend dev servers together.
setlocal

cd /d "%~dp0"

echo ==^> Checking prerequisites

where node >nul 2>&1
if errorlevel 1 goto :no_node

where docker >nul 2>&1
if errorlevel 1 goto :no_docker

docker info >nul 2>&1
if errorlevel 1 goto :docker_not_running

if exist ".env" goto :env_exists
echo ==^> No .env file found - creating one from .env.example
copy /y ".env.example" ".env" >nul
echo.
echo Open .env and set ANTHROPIC_API_KEY to your Anthropic API key, then re-run start.bat.
exit /b 1

:env_exists
findstr /r /c:"^ANTHROPIC_API_KEY=..*" ".env" >nul
if errorlevel 1 goto :no_api_key

if exist "node_modules" goto :deps_installed
echo ==^> Installing dependencies ^(npm install^)
call npm install
if errorlevel 1 exit /b 1

:deps_installed
echo ==^> Building the sandbox Docker image ^(used to run submitted/sandbox code^)
docker build -t pytho-trainer-sandbox docker\sandbox
if errorlevel 1 exit /b 1

echo ==^> Starting the backend and frontend dev servers
echo     Backend:  http://localhost:3001
echo     Frontend: http://localhost:5173
call npm run dev
exit /b 0

:no_node
echo Node.js is required but was not found. Install Node 20+ and re-run this script.
exit /b 1

:no_docker
echo Docker is required ^(it runs submitted code in a locked-down sandbox^) but was not found.
echo Install Docker Desktop, make sure it's running, and re-run this script.
exit /b 1

:docker_not_running
echo Docker is installed but doesn't seem to be running. Start Docker and re-run this script.
exit /b 1

:no_api_key
echo ANTHROPIC_API_KEY is not set in .env - add your Anthropic API key there, then re-run start.bat.
exit /b 1
