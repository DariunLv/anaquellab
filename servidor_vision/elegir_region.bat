@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Se abrira una ventana: dibuja con el mouse el area de las camaras y pulsa ENTER.
python elegir_region.py
pause
