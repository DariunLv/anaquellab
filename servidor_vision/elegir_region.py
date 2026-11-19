"""Ayuda para capturar la pantalla: te deja marcar con el mouse la región donde se ven las cámaras de Hik-Connect
y te imprime la línea para pegar en config.json (campo "fuente").

Pasos: 1) abre Hik-Connect con las cámaras visibles en pantalla completa  2) ejecuta:  python elegir_region.py
       3) arrastra un rectángulo sobre las cámaras y pulsa ENTER  4) copia la línea "pantalla:..." a config.json."""
import cv2, mss, numpy as np
with mss.mss() as s:
    mon = s.monitors[1]
    img = np.array(s.grab(mon))[:, :, :3]
img = np.ascontiguousarray(img)
x, y, w, h = cv2.selectROI("Marca la región con las cámaras y pulsa ENTER", img, showCrosshair=True)
cv2.destroyAllWindows()
if w and h:
    print(f'\n"fuente": "pantalla:{mon["left"] + x},{mon["top"] + y},{w},{h}"\n')
else:
    print("No se marcó ninguna región.")
