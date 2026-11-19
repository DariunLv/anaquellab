@echo off
chcp 65001 >nul
REM AnaquelLab - enciende el servidor de vision (Python + OpenCV + YOLO)
cd /d "%~dp0"
python -m pip install -r requirements.txt
:inicio
python vision_server.py
if %errorlevel%==3 (
  echo Reiniciando con las camaras nuevas...
  timeout /t 2 >nul
  goto inicio
)
pause
