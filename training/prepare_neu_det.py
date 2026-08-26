import argparse
import json
import shutil
from collections import Counter
from pathlib import Path


CLASS_NAMES = [
    "crazing",
    "inclusion",
    "patches",
    "pitted_surface",
    "rolled-in_scale",
    "scratches",
]


def class_from_filename(path: Path) -> str:
    stem = path.stem.lower()
    for name in CLASS_NAMES:
        if stem.startswith(name):
            return name
    raise ValueError(f"Cannot infer class from filename: {path.name}")


def validate_label(path: Path) -> None:
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        parts = line.split()
        if len(parts) != 5:
            raise ValueError(f"Invalid YOLO label at {path}:{line_number}")
        class_id = int(parts[0])
        coordinates = [float(value) for value in parts[1:]]
        if class_id not in range(len(CLASS_NAMES)) or any(value < 0 or value > 1 for value in coordinates):
            raise ValueError(f"Out-of-range label at {path}:{line_number}")


def copy_pair(image: Path, label: Path, output: Path, split: str) -> None:
    image_dir = output / "images" / split
    label_dir = output / "labels" / split
    image_dir.mkdir(parents=True, exist_ok=True)
    label_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(image, image_dir / image.name)
    shutil.copy2(label, label_dir / label.name)


def prepare(source: Path, output: Path, val_per_class: int = 30) -> dict:
    source = source.resolve()
    output = output.resolve()
    train_images = sorted((source / "train" / "images").glob("*.jpg"))
    test_images = sorted((source / "test" / "images").glob("*.jpg"))
    if not train_images or not test_images:
        raise FileNotFoundError("Expected source/train/images and source/test/images")

    grouped = {name: [] for name in CLASS_NAMES}
    for image in train_images:
        grouped[class_from_filename(image)].append(image)

    if output.exists():
        shutil.rmtree(output)

    counts = Counter()
    for class_name, images in grouped.items():
        if len(images) <= val_per_class:
            raise ValueError(f"Not enough {class_name} samples for validation split")
        validation = images[-val_per_class:]
        training = images[:-val_per_class]
        for split, selected in (("train", training), ("val", validation)):
            for image in selected:
                label = source / "train" / "labels" / f"{image.stem}.txt"
                if not label.exists():
                    raise FileNotFoundError(label)
                validate_label(label)
                copy_pair(image, label, output, split)
                counts[split] += 1

    for image in test_images:
        label = source / "test" / "labels" / f"{image.stem}.txt"
        if not label.exists():
            raise FileNotFoundError(label)
        validate_label(label)
        copy_pair(image, label, output, "test")
        counts["test"] += 1

    yaml_path = output / "neu-det.yaml"
    yaml_path.write_text(
        "path: " + output.as_posix() + "\n"
        "train: images/train\n"
        "val: images/val\n"
        "test: images/test\n"
        "names:\n" + "".join(f"  {index}: {name}\n" for index, name in enumerate(CLASS_NAMES)),
        encoding="utf-8",
    )
    manifest = {
        "source": source.as_posix(),
        "output": output.as_posix(),
        "classes": CLASS_NAMES,
        "splits": dict(counts),
        "strategy": "Last 30 sorted images per class from original train split become validation; original test split is retained.",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare NEU-DET for reproducible YOLO11n training")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/local/NEU-DET-YOLO"))
    parser.add_argument("--val-per-class", type=int, default=30)
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.output, args.val_per_class), indent=2))


if __name__ == "__main__":
    main()
