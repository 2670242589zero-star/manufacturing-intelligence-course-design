"""Shared preprocessing helpers for the process-quality regression model."""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


FEATURE_COLUMNS = [
    "iron_feed_pct",
    "silica_feed_pct",
    "starch_flow",
    "amina_flow",
    "ore_pulp_flow",
    "ore_pulp_ph",
    "ore_pulp_density",
    "flotation_air_flow_avg",
    "flotation_level_avg",
]
TARGET_COLUMN = "silica_concentrate_pct"
LEAKAGE_COLUMNS = ["iron_concentrate_pct"]

RAW_REQUIRED_COLUMNS = [
    "date",
    "% Iron Feed",
    "% Silica Feed",
    "Starch Flow",
    "Amina Flow",
    "Ore Pulp Flow",
    "Ore Pulp pH",
    "Ore Pulp Density",
    *[f"Flotation Column {index:02d} Air Flow" for index in range(1, 8)],
    *[f"Flotation Column {index:02d} Level" for index in range(1, 8)],
    "% Iron Concentrate",
    "% Silica Concentrate",
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series.astype(str).str.replace(",", ".", regex=False), errors="coerce")


def load_hourly_dataset(path: Path) -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(path, dtype=str)
    missing_columns = [column for column in RAW_REQUIRED_COLUMNS if column not in raw.columns]
    if missing_columns:
        raise ValueError(f"Missing required source columns: {', '.join(missing_columns)}")

    timestamp = pd.to_datetime(raw["date"], errors="coerce")
    numeric = {column: _numeric(raw[column]) for column in RAW_REQUIRED_COLUMNS if column != "date"}
    air_columns = [f"Flotation Column {index:02d} Air Flow" for index in range(1, 8)]
    level_columns = [f"Flotation Column {index:02d} Level" for index in range(1, 8)]
    numeric_frame = pd.DataFrame(numeric)

    normalized = pd.DataFrame(
        {
            "timestamp": timestamp,
            "iron_feed_pct": numeric_frame["% Iron Feed"],
            "silica_feed_pct": numeric_frame["% Silica Feed"],
            "starch_flow": numeric_frame["Starch Flow"],
            "amina_flow": numeric_frame["Amina Flow"],
            "ore_pulp_flow": numeric_frame["Ore Pulp Flow"],
            "ore_pulp_ph": numeric_frame["Ore Pulp pH"],
            "ore_pulp_density": numeric_frame["Ore Pulp Density"],
            "flotation_air_flow_avg": numeric_frame[air_columns].mean(axis=1),
            "flotation_level_avg": numeric_frame[level_columns].mean(axis=1),
            "iron_concentrate_pct": numeric_frame["% Iron Concentrate"],
            TARGET_COLUMN: numeric_frame["% Silica Concentrate"],
        }
    )

    missing_cells = int(normalized.isna().sum().sum())
    if missing_cells:
        normalized = normalized.dropna(subset=["timestamp", TARGET_COLUMN])

    hourly = (
        normalized.assign(timestamp=normalized["timestamp"].dt.floor("h"))
        .groupby("timestamp", as_index=False)
        .mean(numeric_only=True)
        .sort_values("timestamp")
        .reset_index(drop=True)
    )
    if len(hourly) < 30:
        raise ValueError(f"Hourly dataset has only {len(hourly)} rows; at least 30 are required")

    audit = {
        "rawRows": int(len(raw)),
        "rawColumns": int(len(raw.columns)),
        "rawMissingCellsAfterParsing": missing_cells,
        "duplicateRawTimestamps": int(timestamp.duplicated().sum()),
        "hourlyRows": int(len(hourly)),
        "timestampMin": hourly["timestamp"].min().isoformat(),
        "timestampMax": hourly["timestamp"].max().isoformat(),
        "targetUniqueRaw": int(numeric_frame["% Silica Concentrate"].nunique()),
        "targetUniqueHourly": int(hourly[TARGET_COLUMN].nunique()),
        "ironConcentrateTargetCorrelation": float(
            hourly[["iron_concentrate_pct", TARGET_COLUMN]].corr().iloc[0, 1]
        ),
    }
    return hourly, audit


def chronological_split(
    frame: pd.DataFrame, train_ratio: float = 0.70, validation_ratio: float = 0.15
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train_end = int(len(frame) * train_ratio)
    validation_end = int(len(frame) * (train_ratio + validation_ratio))
    train = frame.iloc[:train_end].copy()
    validation = frame.iloc[train_end:validation_end].copy()
    test = frame.iloc[validation_end:].copy()
    if min(len(train), len(validation), len(test)) == 0:
        raise ValueError("Chronological split produced an empty partition")
    return train, validation, test


def regression_metrics(y_true: pd.Series | np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(mean_squared_error(y_true, y_pred) ** 0.5),
        "r2": float(r2_score(y_true, y_pred)),
    }


def split_summary(frame: pd.DataFrame) -> dict:
    return {
        "rows": int(len(frame)),
        "from": frame["timestamp"].min().isoformat(),
        "to": frame["timestamp"].max().isoformat(),
    }
