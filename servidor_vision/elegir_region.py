"""Conecta las cámaras viendo la pantalla de Hik-Connect (cuando no puedes usar la dirección del DVR).

1) Abre Hik-Connect con las cámaras visibles.  2) Haz doble clic en elegir_region.bat.
3) Para cada cámara de config.json: arrastra un rectángulo sobre ESA cámara y pulsa ENTER.
   (si no quieres cambiar esa cámara, pulsa ESC).  El programa guarda todo solo en config.json."""
import json
from pathlib import Path
import cv2, mss, numpy as np

ruta = Path(__file__).resolve().parent / "config.json"
cfg = json.loads(ruta.read_text(encoding="utf-8"))
with mss.mss() as s:
    mon = s.monitors[1]
    img = np.ascontiguousarray(np.array(s.grab(mon))[:, :, :3])
cambios = 0
for cam in cfg["camaras"]:
    titulo = f"Marca {cam['nombre']} ({cam.get('zona', '')}) y pulsa ENTER  |  ESC = saltar"
    x, y, w, h = cv2.selectROI(titulo, img, showCrosshair=True)
    cv2.destroyAllWindows()
    if w > 20 and h > 20:
        cam["fuente"] = f"pantalla:{mon['left'] + x},{mon['top'] + y},{w},{h}"
        cambios += 1
        print(f"✔ {cam['nombre']} guardada.")
    else:
        print(f"– {cam['nombre']}: sin cambios.")
if cambios:
    ruta.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListo: {cambios} cámara(s) guardadas en config.json. Reinicia el servidor (iniciar_servidor.bat).")
else:
    print("\nNo se cambió nada.")
