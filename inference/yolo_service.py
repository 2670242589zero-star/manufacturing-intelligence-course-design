"""Local YOLO11n inference service for the course-design demo.

The service intentionally keeps the model and source images local. It accepts a
JSON data URL, performs OpenCV decoding plus Ultralytics inference, and returns
a small JSON result consumed by server.js.
"""

import argparse
import base64
import binascii
import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

os.environ.setdefault("YOLO_CONFIG_DIR", str(Path(__file__).resolve().parents[1] / ".ultralytics"))

import cv2
import numpy as np
from ultralytics import YOLO


LABELS_ZH = {
    "crazing": "裂纹",
    "inclusion": "夹杂",
    "patches": "斑块",
    "pitted_surface": "麻面",
    "rolled-in_scale": "轧入氧化皮",
    "scratches": "划痕",
}
DATA_URL_RE = re.compile(r"^data:image/(?:png|jpeg|jpg|webp);base64,(?P<data>[A-Za-z0-9+/=]+)$", re.IGNORECASE)


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def classify_risk(risk_score: float) -> dict[str, str]:
    if risk_score >= 70:
        return {"level": "high", "label": "高风险", "tone": "danger"}
    if risk_score >= 42:
        return {"level": "medium", "label": "中风险", "tone": "warning"}
    return {"level": "low", "label": "低风险", "tone": "success"}


def resolve_model(explicit: str | None = None) -> Path:
    candidates = [
        Path(explicit) if explicit else None,
        Path(os.environ["YOLO_MODEL_PATH"]) if os.environ.get("YOLO_MODEL_PATH") else None,
        Path("models/yolo11n-neu-det/best.pt"),
        Path("training/runs/neu-det-yolo11n/weights/best.pt"),
    ]
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate.resolve()
    searched = [str(candidate) for candidate in candidates if candidate]
    raise FileNotFoundError("YOLO11n model not found; searched: " + ", ".join(searched))


def decode_image(image_data: str) -> np.ndarray:
    match = DATA_URL_RE.fullmatch(image_data or "")
    if not match:
        raise ValueError("imageData must be a base64 image data URL")
    try:
        raw = base64.b64decode(match.group("data"), validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("invalid base64 imageData") from error
    if len(raw) > 6 * 1024 * 1024:
        raise ValueError("imageData exceeds 6 MB")
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("unable to decode image")
    return image


def image_metrics(image: np.ndarray) -> dict[str, float]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    edges = cv2.Canny(gray, 80, 160)
    edge_density = float(np.count_nonzero(edges) / edges.size)
    sharpness = float(clamp(cv2.Laplacian(gray, cv2.CV_64F).var() / 12, 0, 100))
    return {
        "brightness": round(brightness, 3),
        "contrast": round(contrast, 3),
        "edgeDensity": round(edge_density, 5),
        "sharpness": round(sharpness, 3),
    }


class InferenceEngine:
    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = resolve_model(model_path)
        self.model = YOLO(str(self.model_path))
        self.confidence = float(os.environ.get("YOLO_CONFIDENCE", "0.25"))
        self.iou = float(os.environ.get("YOLO_IOU", "0.45"))
        self.imgsz = int(os.environ.get("YOLO_IMAGE_SIZE", "320"))
        self.device = os.environ.get("YOLO_DEVICE", "0")

    def infer(self, image: np.ndarray, process: dict[str, Any] | None) -> dict[str, Any]:
        process = process or {}
        metrics = image_metrics(image)
        results = self.model.predict(
            source=image,
            imgsz=self.imgsz,
            conf=self.confidence,
            iou=self.iou,
            device=self.device,
            verbose=False,
        )
        prediction = results[0]
        height, width = image.shape[:2]
        detections: list[dict[str, Any]] = []
        if prediction.boxes is not None:
            for box, confidence, class_id in zip(
                prediction.boxes.xyxy.cpu().tolist(),
                prediction.boxes.conf.cpu().tolist(),
                prediction.boxes.cls.cpu().tolist(),
            ):
                x1, y1, x2, y2 = box
                raw_label = str(self.model.names[int(class_id)])
                label = LABELS_ZH.get(raw_label, raw_label)
                area = max(0, int((x2 - x1) * (y2 - y1)))
                detections.append({
                    "type": label,
                    "className": raw_label,
                    "confidence": round(float(confidence), 4),
                    "area": area,
                    "box": [
                        round(x1 / width * 240, 2),
                        round(y1 / height * 200, 2),
                        round(x2 / width * 240, 2),
                        round(y2 / height * 200, 2),
                    ],
                })
        detections.sort(key=lambda item: item["confidence"], reverse=True)
        temperature = float(process.get("temperature", 68))
        pressure = float(process.get("pressure", 3.8))
        speed = float(process.get("speed", 42))
        defect_risk = sum(item["confidence"] * 72 for item in detections)
        process_risk = abs(temperature - 68) * 0.55 + abs(pressure - 3.8) * 6 + abs(speed - 42) * 0.22
        quality_score = round(clamp(100 - defect_risk - process_risk, 12, 98))
        risk_score = 100 - quality_score
        contributors = [
            {"name": "缺陷信号", "value": round(defect_risk), "detail": "检测到可疑视觉区域" if detections else "未发现明显缺陷"},
            {"name": "温度偏差", "value": round(abs(temperature - 68) * 1.2), "detail": f"{temperature:.1f} °C"},
            {"name": "压力偏差", "value": round(abs(pressure - 3.8) * 8), "detail": f"{pressure:.1f} MPa"},
            {"name": "速度偏差", "value": round(abs(speed - 42) * 0.5), "detail": f"{speed:.0f} m/min"},
        ]
        contributors.sort(key=lambda item: item["value"], reverse=True)
        return {
            "qualityScore": quality_score,
            "risk": classify_risk(risk_score),
            "detections": detections,
            "contributors": contributors,
            "summary": (
                f"YOLO11n 检测到 {len(detections)} 类缺陷候选，建议质量工程师结合工艺参数复核。"
                if detections
                else "YOLO11n 当前未发现明显缺陷候选，可继续关注工艺参数趋势。"
            ),
            "method": "OpenCV preprocessing + YOLO11n local service",
            "model": {"name": "YOLO11n", "weights": self.model_path.name, "imgsz": self.imgsz},
            "imageMetrics": metrics,
            "analyzedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat().replace("+00:00", "Z"),
        }


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "ManufacturingQualityYOLO/0.1"

    def send_json(self, status: int, body: dict[str, Any]) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, {"ok": True, "service": "yolo11n-inference", "model": self.server.engine.model_path.name})
            return
        self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path != "/infer":
            self.send_json(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 8 * 1024 * 1024:
                raise ValueError("request_too_large_or_empty")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            image = decode_image(payload.get("imageData", ""))
            result = self.server.engine.infer(image, payload.get("process"))
            self.send_json(200, result)
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": "invalid_request", "message": str(error)})
        except Exception as error:  # The Node adapter exposes this as a failed remote call.
            self.send_json(500, {"error": "inference_failed", "message": str(error)})

    def log_message(self, format: str, *args: Any) -> None:
        print("[yolo-service] " + format % args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local YOLO11n inference service")
    parser.add_argument("--model", default=None, help="Path to trained YOLO11n weights")
    parser.add_argument("--host", default=os.environ.get("YOLO_SERVICE_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("YOLO_SERVICE_PORT", "8000")))
    args = parser.parse_args()
    engine = InferenceEngine(args.model)
    service = HTTPServer((args.host, args.port), RequestHandler)
    service.engine = engine  # type: ignore[attr-defined]
    print(json.dumps({"host": args.host, "port": args.port, "model": str(engine.model_path), "imgsz": engine.imgsz}, ensure_ascii=False))
    service.serve_forever()


if __name__ == "__main__":
    main()
