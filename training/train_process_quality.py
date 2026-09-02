"""Train, evaluate and export the leakage-safe process-quality baseline."""

from __future__ import annotations

import argparse
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

from process_quality_common import (
    FEATURE_COLUMNS,
    LEAKAGE_COLUMNS,
    TARGET_COLUMN,
    chronological_split,
    load_hourly_dataset,
    regression_metrics,
    sha256_file,
    split_summary,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "data/local/mining-quality-source/full-20260830/MiningProcess_Flotation_Plant_Database.csv"
DEFAULT_OUTPUT = PROJECT_ROOT / "models/process-quality-rf"
DEFAULT_REPORT = PROJECT_ROOT / "docs/process-quality-training-report.json"
DEFAULT_HOURLY = PROJECT_ROOT / "data/local/mining-quality-source/processed/process-quality-hourly.csv"

CANDIDATES = [
    {"n_estimators": 200, "max_depth": 12, "min_samples_leaf": 4},
    {"n_estimators": 300, "max_depth": 18, "min_samples_leaf": 2},
    {"n_estimators": 300, "max_depth": None, "min_samples_leaf": 2},
]


def relative_or_name(path: Path) -> str:
    try:
        return path.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return path.name


def build_pipeline(params: dict) -> Pipeline:
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            (
                "model",
                RandomForestRegressor(
                    random_state=42,
                    n_jobs=-1,
                    max_features=1.0,
                    **params,
                ),
            ),
        ]
    )


def evaluate_candidates(train: pd.DataFrame, validation: pd.DataFrame) -> tuple[dict, list[dict]]:
    results = []
    for params in CANDIDATES:
        pipeline = build_pipeline(params)
        pipeline.fit(train[FEATURE_COLUMNS], train[TARGET_COLUMN])
        prediction = pipeline.predict(validation[FEATURE_COLUMNS])
        results.append({"parameters": params, "validation": regression_metrics(validation[TARGET_COLUMN], prediction)})
    selected = min(results, key=lambda item: item["validation"]["mae"])
    return selected, results


def export_onnx(pipeline: Pipeline, destination: Path, sample: pd.DataFrame) -> dict:
    try:
        import onnxruntime as ort
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
    except ImportError as error:
        return {"status": "skipped", "reason": f"missing dependency: {error.name}"}

    model = convert_sklearn(
        pipeline,
        initial_types=[("process_features", FloatTensorType([None, len(FEATURE_COLUMNS)]))],
        target_opset=17,
    )
    destination.write_bytes(model.SerializeToString())
    session = ort.InferenceSession(str(destination), providers=["CPUExecutionProvider"])
    values = sample[FEATURE_COLUMNS].astype(np.float32).to_numpy()
    onnx_prediction = np.asarray(session.run(None, {"process_features": values})[0]).reshape(-1)
    sklearn_prediction = pipeline.predict(sample[FEATURE_COLUMNS]).reshape(-1)
    return {
        "status": "exported",
        "file": relative_or_name(destination),
        "sha256": sha256_file(destination),
        "validationRows": int(len(sample)),
        "maxAbsoluteDifference": float(np.max(np.abs(onnx_prediction - sklearn_prediction))),
        "opset": 17,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--hourly-output", type=Path, default=DEFAULT_HOURLY)
    args = parser.parse_args()

    input_path = args.input.resolve()
    output_dir = args.output_dir.resolve()
    report_path = args.report.resolve()
    hourly_output = args.hourly_output.resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Process-quality dataset not found: {input_path}")

    hourly, audit = load_hourly_dataset(input_path)
    train, validation, test = chronological_split(hourly)
    selected, candidates = evaluate_candidates(train, validation)

    train_validation = pd.concat([train, validation], ignore_index=True)
    pipeline = build_pipeline(selected["parameters"])
    pipeline.fit(train_validation[FEATURE_COLUMNS], train_validation[TARGET_COLUMN])
    test_prediction = pipeline.predict(test[FEATURE_COLUMNS])
    test_metrics = regression_metrics(test[TARGET_COLUMN], test_prediction)

    baseline_value = float(train_validation[TARGET_COLUMN].median())
    baseline_prediction = np.full(len(test), baseline_value)
    baseline_metrics = regression_metrics(test[TARGET_COLUMN], baseline_prediction)

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    hourly_output.parent.mkdir(parents=True, exist_ok=True)
    hourly.to_csv(hourly_output, index=False)

    model_path = output_dir / "model.joblib"
    joblib.dump(pipeline, model_path)
    onnx_result = export_onnx(pipeline, output_dir / "model.onnx", test.head(64))

    forest = pipeline.named_steps["model"]
    importance = sorted(
        (
            {"feature": feature, "importance": float(value)}
            for feature, value in zip(FEATURE_COLUMNS, forest.feature_importances_)
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )
    target_quantiles = {
        "q50": float(train_validation[TARGET_COLUMN].quantile(0.50)),
        "q80": float(train_validation[TARGET_COLUMN].quantile(0.80)),
        "q95": float(train_validation[TARGET_COLUMN].quantile(0.95)),
    }
    feature_ranges = {
        feature: {
            "min": float(train_validation[feature].min()),
            "max": float(train_validation[feature].max()),
            "median": float(train_validation[feature].median()),
        }
        for feature in FEATURE_COLUMNS
    }

    manifest = {
        "schemaVersion": 1,
        "modelId": "process-quality-random-forest-v1",
        "modelType": "RandomForestRegressor",
        "target": TARGET_COLUMN,
        "features": FEATURE_COLUMNS,
        "excludedLeakageFields": LEAKAGE_COLUMNS,
        "selectedParameters": selected["parameters"],
        "targetQuantiles": target_quantiles,
        "featureRanges": feature_ranges,
        "featureImportance": importance,
        "evaluation": {
            "test": test_metrics,
            "medianBaseline": {"value": baseline_value, **baseline_metrics},
            "maeImprovementOverBaselinePct": float(
                (baseline_metrics["mae"] - test_metrics["mae"]) / baseline_metrics["mae"] * 100
            ),
        },
        "modelSha256": sha256_file(model_path),
        "trainedAt": datetime.now(timezone.utc).isoformat(),
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = {
        "schemaVersion": 1,
        "modelId": manifest["modelId"],
        "source": {
            "name": "Quality Prediction in a Mining Process",
            "url": "https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process",
            "license": "CC0: Public Domain",
            "localFile": relative_or_name(input_path),
            "sha256": sha256_file(input_path),
        },
        "preprocessing": {
            "aggregation": "hourly mean after parsing locale decimal commas",
            "audit": audit,
            "hourlyOutput": relative_or_name(hourly_output),
            "features": FEATURE_COLUMNS,
            "target": TARGET_COLUMN,
            "excludedLeakageFields": LEAKAGE_COLUMNS,
        },
        "split": {
            "strategy": "chronological 70/15/15 without shuffling",
            "train": split_summary(train),
            "validation": split_summary(validation),
            "test": split_summary(test),
        },
        "selection": {"metric": "validation MAE", "candidates": candidates, "selected": selected},
        "evaluation": {
            "test": test_metrics,
            "medianBaseline": {"value": baseline_value, **baseline_metrics},
            "maeImprovementOverBaselinePct": float((baseline_metrics["mae"] - test_metrics["mae"]) / baseline_metrics["mae"] * 100),
        },
        "featureImportance": importance,
        "targetQuantiles": target_quantiles,
        "artifacts": {
            "joblib": {"file": relative_or_name(model_path), "sha256": manifest["modelSha256"], "uploaded": False},
            "manifest": {"file": relative_or_name(manifest_path), "uploaded": False},
            "onnx": {**onnx_result, "uploaded": False},
        },
        "runtime": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "pandas": pd.__version__,
            "scikitLearn": sklearn.__version__,
            "joblib": joblib.__version__,
            "numpy": np.__version__,
        },
        "limitations": [
            "Metrics describe the public dataset time range and are not production-site accuracy claims.",
            "Feature importance represents predictive association, not confirmed process causality.",
            "Risk thresholds in the inference service are relative to training-target quantiles and require domain validation.",
        ],
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": relative_or_name(report_path), "selected": selected, "test": test_metrics, "onnx": onnx_result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
