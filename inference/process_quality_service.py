"""Local RandomForest process-quality inference service."""

from __future__ import annotations

import argparse
import json
import math
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = PROJECT_ROOT / "models/process-quality-rf/model.joblib"
DEFAULT_MANIFEST = PROJECT_ROOT / "models/process-quality-rf/manifest.json"
FEATURE_LABELS = {
    "iron_feed_pct": "入料铁品位",
    "silica_feed_pct": "入料二氧化硅",
    "starch_flow": "淀粉流量",
    "amina_flow": "胺流量",
    "ore_pulp_flow": "矿浆流量",
    "ore_pulp_ph": "矿浆 pH",
    "ore_pulp_density": "矿浆密度",
    "flotation_air_flow_avg": "浮选柱平均气流",
    "flotation_level_avg": "浮选柱平均液位",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def risk_from_prediction(value: float, quantiles: dict[str, float]) -> dict[str, str]:
    if value > float(quantiles["q95"]):
        return {"level": "high", "label": "高风险", "tone": "danger"}
    if value > float(quantiles["q80"]):
        return {"level": "medium", "label": "中风险", "tone": "warning"}
    return {"level": "low", "label": "低风险", "tone": "success"}


class ProcessQualityEngine:
    def __init__(self, model_path: Path, manifest_path: Path) -> None:
        if not model_path.exists():
            raise FileNotFoundError(f"Process-quality model not found: {model_path}")
        if not manifest_path.exists():
            raise FileNotFoundError(f"Process-quality manifest not found: {manifest_path}")
        self.model_path = model_path.resolve()
        self.manifest_path = manifest_path.resolve()
        self.model = joblib.load(self.model_path)
        self.manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        self.features = list(self.manifest["features"])
        self.quantiles = dict(self.manifest["targetQuantiles"])
        self.ranges = dict(self.manifest["featureRanges"])
        self.importance = list(self.manifest.get("featureImportance", []))

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "service": "process-quality-random-forest",
            "modelId": self.manifest["modelId"],
            "modelType": self.manifest["modelType"],
            "target": self.manifest["target"],
            "features": self.features,
            "excludedLeakageFields": self.manifest.get("excludedLeakageFields", []),
            "targetQuantiles": self.quantiles,
            "evaluation": self.manifest.get("evaluation"),
            "trainedAt": self.manifest.get("trainedAt"),
        }

    def _validated_features(self, payload: dict[str, Any]) -> dict[str, float]:
        supplied = payload.get("features")
        if not isinstance(supplied, dict):
            raise ValueError("features_must_be_an_object")
        values: dict[str, float] = {}
        missing = [feature for feature in self.features if feature not in supplied]
        if missing:
            raise ValueError("missing_features:" + ",".join(missing))
        for feature in self.features:
            raw = supplied[feature]
            if isinstance(raw, bool):
                raise ValueError("invalid_feature:" + feature)
            try:
                value = float(raw)
            except (TypeError, ValueError) as error:
                raise ValueError("invalid_feature:" + feature) from error
            if not math.isfinite(value):
                raise ValueError("invalid_feature:" + feature)
            values[feature] = value
        return values

    def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        values = self._validated_features(payload)
        frame = pd.DataFrame([values], columns=self.features)
        prediction = float(self.model.predict(frame)[0])
        risk = risk_from_prediction(prediction, self.quantiles)
        warnings = []
        for feature, value in values.items():
            limits = self.ranges[feature]
            if value < float(limits["min"]) or value > float(limits["max"]):
                warnings.append(
                    {
                        "feature": feature,
                        "label": FEATURE_LABELS.get(feature, feature),
                        "value": value,
                        "trainingMin": float(limits["min"]),
                        "trainingMax": float(limits["max"]),
                    }
                )
        importance = [
            {
                "feature": item["feature"],
                "label": FEATURE_LABELS.get(item["feature"], item["feature"]),
                "importance": float(item["importance"]),
                "inputValue": values[item["feature"]],
            }
            for item in self.importance[:5]
        ]
        warning_text = "；存在超出训练范围的输入，需人工复核" if warnings else ""
        return {
            "modelId": self.manifest["modelId"],
            "prediction": {
                "target": self.manifest["target"],
                "value": prediction,
                "rounded": round(prediction, 3),
                "unit": "%",
            },
            "risk": risk,
            "inputRangeWarnings": warnings,
            "globalFeatureImportance": importance,
            "summary": f"预测精矿二氧化硅含量为 {prediction:.3f}%（{risk['label']}）{warning_text}。",
            "method": "RandomForestRegressor joblib local service",
            "analyzedAt": utc_now(),
        }


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "ManufacturingProcessQuality/0.1"

    def send_json(self, status: int, body: dict[str, Any]) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, self.server.engine.health())
            return
        self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path != "/predict":
            self.send_json(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 64 * 1024:
                raise ValueError("request_too_large_or_empty")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("payload_must_be_an_object")
            self.send_json(200, self.server.engine.predict(payload))
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": "invalid_request", "message": str(error)})
        except Exception as error:
            self.send_json(500, {"error": "prediction_failed", "message": str(error)})

    def log_message(self, format: str, *args: Any) -> None:
        print("[process-quality-service] " + format % args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the process-quality RandomForest inference service")
    parser.add_argument("--model", type=Path, default=Path(os.environ.get("PROCESS_QUALITY_MODEL_PATH", DEFAULT_MODEL)))
    parser.add_argument("--manifest", type=Path, default=Path(os.environ.get("PROCESS_QUALITY_MANIFEST_PATH", DEFAULT_MANIFEST)))
    parser.add_argument("--host", default=os.environ.get("PROCESS_QUALITY_SERVICE_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PROCESS_QUALITY_SERVICE_PORT", "8010")))
    args = parser.parse_args()
    engine = ProcessQualityEngine(args.model, args.manifest)
    service = HTTPServer((args.host, args.port), RequestHandler)
    service.engine = engine  # type: ignore[attr-defined]
    print(json.dumps({"host": args.host, "port": args.port, **engine.health()}, ensure_ascii=False))
    service.serve_forever()


if __name__ == "__main__":
    main()
