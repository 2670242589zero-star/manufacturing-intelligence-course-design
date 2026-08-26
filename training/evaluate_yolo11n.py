import argparse
import json
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate trained YOLO11n on the held-out NEU-DET test split")
    parser.add_argument("--weights", type=Path, required=True)
    parser.add_argument("--data", type=Path, default=Path("data/local/NEU-DET-YOLO/neu-det.yaml"))
    parser.add_argument("--imgsz", type=int, default=320)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--device", default="0")
    parser.add_argument("--name", default="neu-det-yolo11n-test")
    args = parser.parse_args()
    if not args.weights.exists() or not args.data.exists():
        raise FileNotFoundError("Weights or dataset config not found")

    metrics = YOLO(str(args.weights)).val(
        data=str(args.data.resolve()),
        split="test",
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=4,
        project=str(Path("training/runs").resolve()),
        name=args.name,
        plots=True,
    )
    summary = {
        "precision": float(metrics.box.mp),
        "recall": float(metrics.box.mr),
        "map50": float(metrics.box.map50),
        "map50_95": float(metrics.box.map),
    }
    output = Path(metrics.save_dir) / "test-metrics.json"
    output.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
