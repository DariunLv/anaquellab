"""
AnaquelLab · Servidor de visión (Python + OpenCV + YOLO)

Qué hace:
  * Lee cada cámara con OpenCV (cv2.VideoCapture): flujo RTSP de las cámaras Hikvision, o un video (.mp4) de prueba.
  * Detecta personas con YOLO (Ultralytics) y las sigue con ByteTrack (un identificador temporal por persona, sin reconocer rostros).
  * Cuenta acercamientos a la zona del anaquel (ROI), mide permanencia, ocupación y genera el MAPA DE CALOR automáticamente.
  * Publica todo en una API local (FastAPI) y sirve la página AnaquelLab (carpeta ../dist), de modo que
    el tablero «Centro de inteligencia» se actualiza solo, sin intervención manual.

Uso:  python vision_server.py            (abre http://localhost:8000)
"""
import json, os, sys, time, threading, collections, math, sqlite3, datetime
from pathlib import Path
import cv2
import numpy as np

AQUI = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.environ.get("ANAQUEL_CONFIG", AQUI / "config.json"))
DIST = (AQUI.parent / "dist")
DATOS = AQUI / "datos"            # aquí se guardan los registros REALES (no se pierden al apagar)
DATOS.mkdir(exist_ok=True)
DB_PATH = DATOS / "anaquel.db"
DB_LOCK = threading.Lock()


def db():
    con = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    con.execute("CREATE TABLE IF NOT EXISTS eventos(ts REAL, dia TEXT, hora INT, camara TEXT, tipo TEXT, track INT, permanencia REAL)")
    con.execute("CREATE TABLE IF NOT EXISTS muestras(ts REAL, dia TEXT, hora INT, camara TEXT, personas INT)")
    con.execute("CREATE TABLE IF NOT EXISTS historico(dia TEXT, hora INT, camara TEXT, personas INT, interacciones INT, origen TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS historico_prod(dia TEXT, hora INT, sku TEXT, interacciones INT, ventas INT, ingreso REAL, margen REAL, origen TEXT)")
    con.execute("CREATE INDEX IF NOT EXISTS ix_e ON eventos(dia,camara)")
    con.execute("CREATE INDEX IF NOT EXISTS ix_m ON muestras(dia,camara)")
    return con


CON = db()


def importar_historico():
    """Carga el histórico del equipo (6–18 nov) una sola vez desde historico_6-18nov.csv. Queda marcado con su origen; no mezcla con lo medido por las cámaras."""
    f = AQUI / "historico_6-18nov.csv"
    if not f.exists() or CON.execute("SELECT COUNT(*) FROM historico").fetchone()[0]:
        return
    import csv
    with open(f, encoding="utf-8") as fh:
        filas = [(r["dia"], int(r["hora"]), r["camara"], int(r["personas"]), int(r["interacciones"]), r["origen"]) for r in csv.DictReader(fh)]
    CON.executemany("INSERT INTO historico VALUES(?,?,?,?,?,?)", filas)
    CON.commit()


def importar_historico_producto():
    f = AQUI / "historico_producto_6-18nov.csv"
    if not f.exists() or CON.execute("SELECT COUNT(*) FROM historico_prod").fetchone()[0]:
        return
    import csv
    with open(f, encoding="utf-8") as fh:
        filas = [(r["dia"], int(r["hora"]), r["sku"], int(r["interacciones"]), int(r["ventas"]), float(r["ingreso"]), float(r["margen"]), r["origen"]) for r in csv.DictReader(fh)]
    CON.executemany("INSERT INTO historico_prod VALUES(?,?,?,?,?,?,?,?)", filas)
    CON.commit()


def registrar(sql, args):
    with DB_LOCK:
        CON.execute(sql, args)
        CON.commit()


def consultar(sql, args=()):
    with DB_LOCK:
        return CON.execute(sql, args).fetchall()


def ahora():
    t = datetime.datetime.now()
    return time.time(), t.strftime("%Y-%m-%d"), t.hour


AJUSTES = {"detector": True, "mapa_calor": True, "trayectorias": False, "roi": True, "intensidad": 0.70, "transparencia": 0.60}
AJUSTES_LOCK = threading.Lock()


def cargar_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def en_roi(pt, roi, w, h):
    x, y = pt
    rx, ry, rw, rh = roi
    return rx * w <= x <= (rx + rw) * w and ry * h <= y <= (ry + rh) * h


class CapturaPantalla:
    """Captura una región de TU pantalla (por ejemplo, la ventana de Hik-Connect con las cámaras abiertas).
    fuente = "pantalla:izquierda,arriba,ancho,alto"  (en píxeles; usa elegir_region.py para obtenerlos)  o  "pantalla" (monitor completo)."""

    def __init__(self, texto):
        import mss
        self.sct = mss.mss()
        partes = texto.split(":", 1)[1] if ":" in texto else ""
        if partes:
            l, t, w, h = [int(float(v)) for v in partes.split(",")]
            self.region = {"left": l, "top": t, "width": w, "height": h}
        else:
            self.region = self.sct.monitors[1]
        self.abierta = True

    def isOpened(self):
        return self.abierta

    def read(self):
        try:
            img = np.array(self.sct.grab(self.region))[:, :, :3]
            return True, np.ascontiguousarray(img)
        except Exception:
            return False, None

    def get(self, *_):
        return 5

    def release(self):
        self.abierta = False


class CamaraWorker(threading.Thread):
    """Un hilo por cámara: captura, YOLO + ByteTrack, mapa de calor, permanencia y conteos."""

    def __init__(self, cfg, modelo, global_cfg):
        super().__init__(daemon=True)
        self.cfg, self.modelo, self.g = cfg, modelo, global_cfg
        self.id = cfg["id"]
        self.roi = cfg.get("roi", [0, 0, 1, 1])
        self.conf = float(global_cfg.get("confianza", 0.35))
        self.imgsz = int(global_cfg.get("imgsz", 640))
        self.umbral = float(global_cfg.get("umbral_permanencia_s", 3))
        self.detener = threading.Event()
        self.lock = threading.Lock()
        self.jpeg = None
        self.reiniciar()
        self.error = None
        self.conectado = False
        self.fps = 0.0

    def reiniciar(self):
        self.heat = np.zeros((90, 160), np.float32)
        self.tray = collections.defaultdict(lambda: collections.deque(maxlen=60))
        self.dentro_desde = {}      # id -> segundos acumulados dentro del ROI
        self.vistos = set()         # ids que entraron al ROI (acercamientos)
        self.interacciones = set()  # ids que superaron el umbral de permanencia
        self.permanencias = []      # segundos de cada persona que salió o superó el umbral
        self.ocup_max = 0
        self.personas_ahora = 0
        self.inicio = time.time()
        self.ultima_muestra = 0.0
        self.ultimo_guardado = time.time()
        f = DATOS / f"calor_{self.id}.npy"
        if f.exists() and not getattr(self, "_borrar", False):
            try:
                h = np.load(f)
                if h.shape == self.heat.shape:
                    self.heat = h.astype(np.float32)
            except Exception:
                pass

    # ---------- captura ----------
    def abrir(self):
        src = self.cfg["fuente"]
        if isinstance(src, str) and not src.startswith(("rtsp://", "http://", "https://")) and not Path(src).is_absolute():
            alt = (CONFIG_PATH.parent / src)
            src = str(alt) if alt.exists() else src
        if isinstance(src, str) and src.startswith("rtsp://"):
            os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
        if isinstance(src, str) and src.startswith("pantalla"):
            return CapturaPantalla(src), False
        cap = cv2.VideoCapture(src)
        return cap, (not (isinstance(src, str) and src.startswith(("rtsp://", "http"))))

    def run(self):
        while not self.detener.is_set():
            cap, es_archivo = self.abrir()
            if not cap.isOpened():
                self.conectado, self.error = False, f"No se pudo abrir la fuente de {self.id}. Revisa la dirección o el video."
                time.sleep(3)
                continue
            self.conectado, self.error = True, None
            t_prev, n = time.time(), 0
            vfps = cap.get(cv2.CAP_PROP_FPS) or 25
            salto = max(1, int(round(vfps / float(self.g.get("fps_proceso", 5))))) if es_archivo else 1
            while not self.detener.is_set():
                ok, frame = cap.read()
                if not ok:
                    break
                n += 1
                if es_archivo and n % salto:
                    continue
                if not es_archivo and time.time() - t_prev < 1.0 / float(self.g.get("fps_proceso", 5)):
                    continue  # en vivo: descarta cuadros para no acumular retraso
                dt = max(0.05, time.time() - t_prev) if not es_archivo else salto / vfps
                t_prev = time.time()
                try:
                    self.procesar(frame, dt)
                except Exception as e:  # no tumbar el hilo por un cuadro defectuoso
                    self.error = f"Error al procesar: {e}"
                if es_archivo:  # reproduce a velocidad normal
                    time.sleep(max(0, dt - (time.time() - t_prev)))
            cap.release()
            if es_archivo:
                continue  # vuelve a empezar el video (bucle de demostración)
            self.conectado = False
            time.sleep(2)

    # ---------- análisis ----------
    def procesar(self, frame, dt):
        with AJUSTES_LOCK:
            aj = dict(AJUSTES)
        h0, w0 = frame.shape[:2]
        escala = 960 / w0 if w0 > 960 else 1
        if escala != 1:
            frame = cv2.resize(frame, (960, int(h0 * escala)))
        h, w = frame.shape[:2]
        cajas = []
        if aj["detector"]:
            r = self.modelo.track(frame, persist=True, classes=[0], conf=self.conf, imgsz=self.imgsz, tracker="bytetrack.yaml", verbose=False)[0]
            if r.boxes is not None and len(r.boxes):
                xy = r.boxes.xyxy.cpu().numpy()
                ids = r.boxes.id.int().cpu().tolist() if r.boxes.id is not None else list(range(-len(xy), 0))
                for (x1, y1, x2, y2), tid, cf in zip(xy, ids, r.boxes.conf.cpu().numpy()):
                    cajas.append((tid, float(x1), float(y1), float(x2), float(y2), float(cf)))
        ts, dia, hora = ahora()
        dentro = 0
        hh, hw = self.heat.shape
        for tid, x1, y1, x2, y2, cf in cajas:
            pie = ((x1 + x2) / 2, y2)           # punto inferior central: donde pisa la persona
            adentro = en_roi(pie, self.roi, w, h)
            self.tray[tid].append((int(pie[0]), int(pie[1])))
            if adentro:
                dentro += 1
                if tid not in self.vistos:
                    self.vistos.add(tid)
                    registrar("INSERT INTO eventos VALUES(?,?,?,?,?,?,?)", (ts, dia, hora, self.id, "acercamiento", int(tid), 0.0))
                self.dentro_desde[tid] = self.dentro_desde.get(tid, 0.0) + dt
                if self.dentro_desde[tid] >= self.umbral and tid not in self.interacciones:
                    self.interacciones.add(tid)
                    self.permanencias.append(self.dentro_desde[tid])
                    registrar("INSERT INTO eventos VALUES(?,?,?,?,?,?,?)", (ts, dia, hora, self.id, "interaccion", int(tid), float(self.dentro_desde[tid])))
                # mapa de calor: suma una mancha gaussiana en el punto del pie, ponderada por el tiempo
                gx, gy = int(pie[0] / w * hw), int(pie[1] / h * hh)
                if 0 <= gx < hw and 0 <= gy < hh:
                    self.heat[gy, gx] += dt
        self.personas_ahora = dentro
        self.ocup_max = max(self.ocup_max, dentro)
        if ts - self.ultima_muestra >= 10:
            self.ultima_muestra = ts
            registrar("INSERT INTO muestras VALUES(?,?,?,?,?)", (ts, dia, hora, self.id, int(dentro)))
        if ts - self.ultimo_guardado >= 60:
            self.ultimo_guardado = ts
            np.save(DATOS / f"calor_{self.id}.npy", self.heat)
        self.heat *= 0.9999  # olvido muy lento: refleja la actividad reciente
        out = self.dibujar(frame, cajas, aj)
        ok, buf = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if ok:
            with self.lock:
                self.jpeg = buf.tobytes()

    def dibujar(self, frame, cajas, aj):
        h, w = frame.shape[:2]
        out = frame.copy()
        if aj["mapa_calor"] and self.heat.max() > 0:
            hm = cv2.GaussianBlur(self.heat, (0, 0), 3.0)
            hm = np.clip(hm / (hm.max() + 1e-6), 0, 1) ** 0.6
            hm = cv2.resize((hm * 255).astype(np.uint8), (w, h), interpolation=cv2.INTER_CUBIC)
            color = cv2.applyColorMap(hm, cv2.COLORMAP_JET)
            alfa = (hm.astype(np.float32) / 255.0) * float(aj["intensidad"]) * (1.0 - float(aj["transparencia"]) * 0.55) * 0.95
            alfa = alfa[..., None]
            out = (out * (1 - alfa) + color * alfa).astype(np.uint8)
        if aj["roi"]:
            rx, ry, rw, rh = self.roi
            cv2.rectangle(out, (int(rx * w), int(ry * h)), (int((rx + rw) * w), int((ry + rh) * h)), (0, 215, 255), 2)
        if aj["trayectorias"]:
            for tid, pts in self.tray.items():
                if len(pts) > 1:
                    cv2.polylines(out, [np.array(pts, np.int32)], False, (255, 200, 0), 2)
        for tid, x1, y1, x2, y2, cf in cajas:
            adentro = en_roi(((x1 + x2) / 2, y2), self.roi, w, h)
            col = (120, 255, 120) if adentro else (230, 200, 90)
            cv2.rectangle(out, (int(x1), int(y1)), (int(x2), int(y2)), col, 2)
            etiqueta = f"P{tid} {int(cf * 100)}%" + (f" {self.dentro_desde.get(tid, 0):.0f}s" if adentro else "")
            cv2.putText(out, etiqueta, (int(x1), max(14, int(y1) - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 1, cv2.LINE_AA)
        return out

    def estado(self):
        _, dia, _ = ahora()
        ac = consultar("SELECT COUNT(*) FROM eventos WHERE dia=? AND camara=? AND tipo='acercamiento'", (dia, self.id))[0][0]
        it = consultar("SELECT COUNT(*), AVG(permanencia) FROM eventos WHERE dia=? AND camara=? AND tipo='interaccion'", (dia, self.id))[0]
        om = consultar("SELECT MAX(personas) FROM muestras WHERE dia=? AND camara=?", (dia, self.id))[0][0] or 0
        ph = {str(h): 0 for h in range(0, 24)}
        for h, n in consultar("SELECT hora, COUNT(*) FROM eventos WHERE dia=? AND camara=? AND tipo='acercamiento' GROUP BY hora", (dia, self.id)):
            ph[str(h)] = n
        phi = {str(h): 0 for h in range(0, 24)}
        for h, n in consultar("SELECT hora, COUNT(*) FROM eventos WHERE dia=? AND camara=? AND tipo='interaccion' GROUP BY hora", (dia, self.id)):
            phi[str(h)] = n
        return {
            "por_hora_int": phi,
            "id": self.id, "nombre": self.cfg.get("nombre", self.id), "anaquel": self.cfg.get("anaquel", ""), "zona": self.cfg.get("zona", ""),
            "conectado": self.conectado, "error": self.error,
            "personas_ahora": self.personas_ahora, "acercamientos": ac, "interacciones": it[0],
            "permanencia_prom_s": round(it[1] or 0.0, 1), "ocupacion_max": om,
            "por_hora": ph, "segundos_observados": round(time.time() - self.inicio),
        }


def crear_app(workers):
    importar_historico()
    importar_historico_producto()
    from fastapi import FastAPI, Response
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse
    from fastapi.staticfiles import StaticFiles
    app = FastAPI(title="AnaquelLab · Servidor de visión")
    app.add_middleware(CORSMiddleware, allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+\.vercel\.app)$", allow_methods=["*"], allow_headers=["*"])

    @app.get("/api/estado")
    def estado():
        with AJUSTES_LOCK:
            aj = dict(AJUSTES)
        return {"servidor": "AnaquelLab-vision", "modelo": workers[0].g.get("modelo") if workers else None, "ajustes": aj,
                "camaras": [w.estado() for w in workers], "hora_local": time.strftime("%H:%M:%S"), "dia_hoy": time.strftime("%Y-%m-%d")}

    @app.get("/api/camara/{cid}/frame.jpg")
    def frame(cid: str):
        for w in workers:
            if w.id == cid:
                with w.lock:
                    data = w.jpeg
                if data:
                    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "no-store"})
        return Response(status_code=404)

    @app.get("/api/camara/{cid}/stream")
    def stream(cid: str):
        w = next((x for x in workers if x.id == cid), None)
        if not w:
            return Response(status_code=404)

        def gen():
            while True:
                with w.lock:
                    data = w.jpeg
                if data:
                    yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + data + b"\r\n"
                time.sleep(0.15)
        return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")

    @app.post("/api/ajustes")
    def ajustes(cambios: dict):
        with AJUSTES_LOCK:
            for k, v in cambios.items():
                if k in AJUSTES and isinstance(v, type(AJUSTES[k])) or (k in ("intensidad", "transparencia") and isinstance(v, (int, float))):
                    AJUSTES[k] = v
            return dict(AJUSTES)

    @app.get("/api/historial")
    def historial(dias: int = 14):
        desde = (datetime.date.today() - datetime.timedelta(days=max(1, dias) - 1)).strftime("%Y-%m-%d")
        out = {}
        for dia, cam, h, tipo, n, perm in consultar("SELECT dia, camara, hora, tipo, COUNT(*), AVG(permanencia) FROM eventos WHERE dia>=? GROUP BY dia,camara,hora,tipo", (desde,)):
            d = out.setdefault(dia, {}).setdefault(cam, {"acercamientos": 0, "interacciones": 0, "por_hora": {}, "por_hora_int": {}, "perm_s": []})
            if tipo == "acercamiento":
                d["acercamientos"] += n
                d["por_hora"][str(h)] = n
            else:
                d["interacciones"] += n
                d["por_hora_int"][str(h)] = n
                d["perm_s"].append(perm or 0)
        for dia, h, cam, p, it, org in consultar("SELECT dia, hora, camara, personas, interacciones, origen FROM historico WHERE dia>=?", (desde,)):
            d = out.setdefault(dia, {}).setdefault(cam, {"acercamientos": 0, "interacciones": 0, "por_hora": {}, "por_hora_int": {}, "perm_s": []})
            d["acercamientos"] += p
            d["interacciones"] += it
            d["por_hora"][str(h)] = d["por_hora"].get(str(h), 0) + p
            d["por_hora_int"][str(h)] = d["por_hora_int"].get(str(h), 0) + it
            d["origen"] = org
        for dia in out:
            for cam in out[dia].values():
                cam["perm_s"] = round(sum(cam["perm_s"]) / len(cam["perm_s"]), 1) if cam["perm_s"] else 0
        return out

    @app.get("/api/historial_producto")
    def historial_producto(dia: str):
        """Interacciones y ventas por producto de un día del histórico del equipo (marcadas con su origen)."""
        out = {}
        for sku, it, v, ing, mg, org in consultar("SELECT sku, SUM(interacciones), SUM(ventas), SUM(ingreso), SUM(margen), MAX(origen) FROM historico_prod WHERE dia=? GROUP BY sku", (dia,)):
            out[sku] = {"interacciones": it, "ventas": v, "ingreso": round(ing, 2), "margen": round(mg, 2), "origen": org}
        return out

    @app.post("/api/configurar")
    def configurar(datos: dict):
        """Guarda las cámaras Hikvision (RTSP del DVR) en config.json y reinicia el servidor. La clave solo se escribe en este archivo local."""
        import json as _json
        import os
        import re
        from urllib.parse import quote
        ip = str(datos.get("ip", "")).strip()
        puerto = str(datos.get("puerto", "554")).strip() or "554"
        if not re.fullmatch(r"[A-Za-z0-9.\-]{3,100}", ip) or not puerto.isdigit():
            return {"ok": False, "error": "IP o puerto no válidos."}
        canales = [int(c) for c in datos.get("canales", []) if str(c).isdigit() and 0 < int(c) < 65][:16]
        if not canales or not datos.get("usuario") or not datos.get("clave"):
            return {"ok": False, "error": "Faltan usuario, clave o canales."}
        ruta = AQUI / "config.json"
        cfg = _json.loads(ruta.read_text(encoding="utf-8"))
        previas = {c["id"]: c for c in cfg.get("camaras", [])}
        nuevas = []
        for i, ch in enumerate(canales):
            cid = f"cam{ch:02d}"
            base = previas.get(cid, {})
            nuevas.append({"id": cid, "nombre": f"Cámara {ch:02d}", "anaquel": base.get("anaquel", chr(65 + i)), "zona": base.get("zona", f"Zona {ch}"),
                           "fuente": f"rtsp://{quote(str(datos['usuario']), safe='')}:{quote(str(datos['clave']), safe='')}@{ip}:{puerto}/Streaming/Channels/{ch}01",
                           "roi": base.get("roi", [0.05, 0.15, 0.9, 0.8])})
        cfg["camaras"] = nuevas
        ruta.write_text(_json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
        threading.Timer(1.0, lambda: os._exit(3)).start()  # el .bat lo vuelve a encender con la nueva configuración
        return {"ok": True}

    @app.get("/api/calor/{cid}")
    def calor(cid: str):
        for w in workers:
            if w.id == cid:
                m = w.heat.copy()
                return {"filas": m.shape[0], "columnas": m.shape[1], "max": float(m.max()), "celdas": m.round(2).tolist()}
        return Response(status_code=404)

    @app.post("/api/reiniciar")
    def reiniciar():
        """Borra el mapa de calor guardado y los contadores de la sesión (los registros históricos se conservan)."""
        for w in workers:
            w._borrar = True
            w.reiniciar()
            w._borrar = False
            try:
                (DATOS / f"calor_{w.id}.npy").unlink()
            except FileNotFoundError:
                pass
        return {"ok": True}

    if DIST.exists():
        app.mount("/", StaticFiles(directory=str(DIST), html=True), name="web")
    return app


def main():
    cfg = cargar_config()
    from ultralytics import YOLO
    modelo_nombre = cfg.get("modelo", "yolo26n.pt")
    try:
        modelo = YOLO(modelo_nombre)
    except Exception as e:
        print(f"No se pudo cargar {modelo_nombre} ({e}). Se intenta con yolo11n.pt")
        modelo = YOLO("yolo11n.pt")
    workers = []
    for c in cfg["camaras"]:
        # cada cámara con su propia instancia del modelo para que el seguimiento (ByteTrack) no se mezcle
        w = CamaraWorker(c, YOLO(modelo_nombre) if len(cfg["camaras"]) > 1 else modelo, cfg)
        w.start()
        workers.append(w)
    import uvicorn
    puerto = int(cfg.get("puerto", 8000))
    print(f"\nAnaquelLab · visión lista. Abre http://localhost:{puerto}  (pestaña «Centro de inteligencia»)\n")
    uvicorn.run(crear_app(workers), host=cfg.get("host", "127.0.0.1"), port=puerto, log_level="warning")


if __name__ == "__main__":
    main()
