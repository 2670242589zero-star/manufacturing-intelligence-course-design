import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Export trained YOLO11n weights")
    parser.add_argument("--weights", type=Path, required=True)
    parser.add_argument("--format", default="onnx", choices=["onnx", "torchscript", "openvino"])
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()
    if not args.weights.exists():
        raise FileNotFoundError(args.weights)
    output = YOLO(str(args.weights)).export(format=args.format, imgsz=args.imgsz, simplify=True, dynamic=False)
    print(output)


if __name__ == "__main__":
    main()
