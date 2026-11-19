@echo off
chcp 65001 >nul
cd /d "%~dp0"
call node build.mjs
cd dist
echo Se abrira el navegador para iniciar sesion en Vercel la primera vez.
call npx vercel --prod
pause
