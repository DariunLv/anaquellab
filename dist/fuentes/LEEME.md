# AnaquelLab Web · versión 3

Aplicación en español para observación de cámaras, medición de actividad visual y optimización multiobjetivo de anaqueles. Los datos iniciales son ficticios.


> **Versión para la tienda de cosméticos Moquegua 2 (Juliaca): solo datos reales.** El catálogo inicial (`ejemplo.json`) trae únicamente los nombres de los productos y las zonas de las cámaras; precios, costos, stock, demanda y medidas están en cero y debes completarlos en «Productos y anaqueles». El programa no optimiza hasta que estén completos. No hay datos simulados en la aplicación; la muestra de pruebas automáticas está aparte en `test/fixture-prueba.json`. Los archivos de la versión de juguetería están en `_respaldo_jugueteria/`.


## Visión con YOLO + OpenCV (servidor Python) · 19/11/2026
Carpeta `servidor_vision/`: lee las cámaras con **OpenCV** (RTSP, video o captura de pantalla de Hik-Connect), detecta personas con **YOLO** (Ultralytics, yolo26n) y las sigue con **ByteTrack**; genera el **mapa de calor** y **guarda en una base de datos local** (`servidor_vision/datos/`) cada acercamiento y permanencia. La pestaña **Tablero de la tienda** muestra solo esos datos reales y las ventas que registras; si el servidor está apagado lo dice y no inventa cifras. Instrucciones: `servidor_vision/INSTRUCCIONES.md`. **No se ha probado con las cámaras reales de la tienda**: se probó el flujo completo con un video.

## Histórico 6–18 nov 2026
`ejemplo.json` y la carpeta `base_de_datos/` (Excel + CSV) traen el histórico de Moquegua 2: días 6–12 = patrón del equipo; días 13–18 = estimado repitiendo ese patrón (±5 %), marcado en la columna `origen`. El servidor lo carga solo la primera vez desde `servidor_vision/historico_6-18nov.csv` (tabla `historico`, separada de lo medido por las cámaras). Anchos, stock y capacidades son estimaciones. Desde el 19 nov los datos entran de las cámaras.

## Pestaña «Monitoreo en vivo»
Panel verde con las cámaras procesadas por YOLO + OpenCV, controles de análisis, productos por anaquel (stock y demanda), comparación de anaqueles, dona de interacción, mapa de calor por hora, interpretación y verificación del sistema. Solo datos reales del servidor (el histórico 6–18 nov aparece marcado como estimado).
