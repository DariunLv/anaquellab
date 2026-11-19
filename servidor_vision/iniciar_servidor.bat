@echo off
REM AnaquelLab - enciende el servidor de vision (Python + OpenCV + YOLO)
cd /d "%~dp0"
python -m pip install -r requirements.txt
python vision_server.py
pause
