import argparse
import json
from pathlib import Path

import torch
from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune YOLO11n on NEU-DET")
    parser.add_argument("--data", type=Path, default=Path("data/local/NEU-DET-YOLO/neu-det.yaml"))
    parser.add_argument("--weights", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--device", default="0")
    parser.add_argument("--name", default="neu-det-yolo11n")
    parser.add_argument("--project", type=Path, default=Path("training/runs"))
    parser.add_argument("--patience", type=int, default=20)
    args = parser.parse_args()

    if not args.data.exists():
        raise FileNotFoundError(f"Dataset config not found: {args.data}")
    if args.device != "cpu" and not torch.cuda.is_available():
        raise RuntimeError("CUDA device requested but torch.cuda.is_available() is false")

    environment = {
        "torch": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_runtime": torch.version.cuda,
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "weights": args.weights,
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
    }
    args.project.mkdir(parents=True, exist_ok=True)
    (args.project / "environment.json").write_text(json.dumps(environment, indent=2), encoding="utf-8")
    print(json.dumps(environment, indent=2))

    model = YOLO(args.weights)
    model.train(
        data=str(args.data.resolve()),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        workers=args.workers,
        device=args.device,
        project=str(args.project.resolve()),
        name=args.name,
        patience=args.patience,
        pretrained=True,
        optimizer="auto",
        seed=42,
        deterministic=True,
        amp=True,
        plots=True,
        save=True,
        val=True,
        cache=False,
    )


if __name__ == "__main__":
    main()
