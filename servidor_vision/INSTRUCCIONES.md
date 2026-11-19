# Servidor de visión (Python + OpenCV + YOLO) — paso a paso

Esto es lo que hace funcionar el **Centro de inteligencia** con visión artificial real.

## 1. Preparar (una sola vez)
1. Ten Python 3.10 o más nuevo (con Anaconda ya lo tienes).
2. Abre la carpeta `servidor_vision` y haz doble clic en **`iniciar_servidor.bat`**.
   La primera vez instala lo necesario (YOLO, OpenCV, FastAPI) y descarga el modelo `yolo26n.pt` (≈ 5 MB). Necesita internet solo esa vez.

## 2. Poner tus cámaras (archivo `config.json`)
- `fuente`: la dirección de cada cámara.
  - Para **probar** con un video: `"video_prueba.mp4"` (pon ese archivo en esta misma carpeta).
  - Para la **cámara Hikvision**: `rtsp://USUARIO:CLAVE@IP_DEL_DVR:554/Streaming/Channels/101`
    (101 = canal 1, 201 = canal 2, 301 = canal 3, y así). Hay que estar en la misma red del DVR y tener el RTSP habilitado.
- `roi`: la zona del anaquel como `[x, y, ancho, alto]`, en fracciones de la imagen (0 a 1).
- `umbral_permanencia_s`: segundos que una persona debe quedarse en la zona para contar como interacción candidata (por defecto 3).

### Si NO puedes usar RTSP: captura de pantalla de Hik-Connect
Abre Hik-Connect con las cámaras a pantalla completa y ejecuta `python elegir_region.py`; marca con el mouse el área de las cámaras, pulsa ENTER y copia la línea que imprime (`"fuente": "pantalla:..."`) a `config.json`. El servidor analiza lo que se ve en pantalla (la ventana de Hik-Connect debe quedar visible). Esta ruta no se pudo probar aquí.

## 3. Mirar el panel
Con el servidor encendido abre **http://localhost:8000** y entra a **Centro de inteligencia**.
Se actualiza solo: personas, acercamientos, permanencia, mapa de calor, gráficos y recomendaciones.
Si el servidor está apagado, el panel lo dice y no muestra cifras de cámaras: no hay datos inventados en ninguna parte.

## Qué hace cada pieza
| Pieza | Para qué |
|---|---|
| **OpenCV** (`cv2.VideoCapture`) | Lee el flujo RTSP o el video; dibuja el mapa de calor y las cajas |
| **YOLO** (Ultralytics, `yolo26n.pt`) | Detecta personas en cada cuadro |
| **ByteTrack** | Sigue a cada persona con un número temporal (sin reconocer rostros) |
| **FastAPI** | Entrega los datos y las imágenes al panel web |

## Dónde se guardan los datos reales
En `servidor_vision/datos/`: `anaquel.db` (acercamientos y permanencias por hora, cámara y día) y `calor_camXX.npy` (mapa de calor acumulado). No se pierden al apagar. Para empezar de cero usa el botón/servicio de reinicio (POST /api/reiniciar) o borra esa carpeta.

## Importante (honestidad del estudio)
- Se probó el flujo completo con un video de prueba. **No se ha probado todavía con tus cámaras**: hay que revisar el RTSP, el ángulo y la zona (ROI).
- Las cámaras cenitales o de ojo de pez pueden necesitar un modelo YOLO más grande (`yolo26s.pt` o `yolo26m.pt`) o entrenado con tus imágenes.
- Una detección es una *visita candidata*, no una compra. La interacción comercial se confirma revisando eventos.
