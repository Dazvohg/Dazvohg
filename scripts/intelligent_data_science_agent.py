#!/usr/bin/env python3
"""Intelligent data science agent (lightweight, dependency-free).

This script loads a CSV file, inspects the schema, proposes a plan, and runs a
simple baseline evaluation. It is designed as a starter template that can be
extended with richer modeling or LLM integrations.
"""

from __future__ import annotations

import argparse
import csv
import statistics
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Dict, Tuple


@dataclass
class AgentReport:
    dataset_path: Path
    target: str
    task: str
    rows: int
    columns: List[str]
    numeric_columns: List[str]
    missing_counts: Dict[str, int]
    plan: List[str]
    baseline_metrics: Dict[str, float] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)


class DataScienceAgent:
    """Rule-based data science assistant for quick CSV diagnostics."""

    def __init__(
        self,
        dataset_path: Path,
        target: str,
        task: str = "auto",
        delimiter: str | None = None,
    ) -> None:
        self.dataset_path = dataset_path
        self.target = target
        self.task = task
        self.delimiter = delimiter

    def run(self) -> AgentReport:
        rows = list(self._load_rows())
        if not rows:
            raise ValueError("Dataset is empty or could not be read.")

        columns = list(rows[0].keys())
        if self.target not in columns:
            raise ValueError(
                f"Target column '{self.target}' not found. Available columns: {', '.join(columns)}"
            )
        missing_counts = self._count_missing(rows, columns)
        numeric_columns = self._detect_numeric_columns(rows, columns)
        task = self._resolve_task(rows, numeric_columns)
        plan = self._build_plan(task, numeric_columns)
        baseline_metrics, notes = self._run_baseline(rows, task, numeric_columns)

        return AgentReport(
            dataset_path=self.dataset_path,
            target=self.target,
            task=task,
            rows=len(rows),
            columns=columns,
            numeric_columns=numeric_columns,
            missing_counts=missing_counts,
            plan=plan,
            baseline_metrics=baseline_metrics,
            notes=notes,
        )

    def _load_rows(self) -> Iterable[Dict[str, str]]:
        with self.dataset_path.open("r", encoding="utf-8-sig") as handle:
            sample = handle.read(4096)
            handle.seek(0)
            delimiter = self.delimiter or self._sniff_delimiter(sample)
            reader = csv.DictReader(handle, delimiter=delimiter)
            for row in reader:
                yield row

    def _count_missing(self, rows: List[Dict[str, str]], columns: List[str]) -> Dict[str, int]:
        counts = {column: 0 for column in columns}
        for row in rows:
            for column in columns:
                value = row.get(column, "")
                if value is None or value.strip() == "":
                    counts[column] += 1
        return counts

    def _detect_numeric_columns(self, rows: List[Dict[str, str]], columns: List[str]) -> List[str]:
        numeric_columns = []
        for column in columns:
            values = [row.get(column, "") for row in rows]
            numeric_values = [value for value in values if value not in (None, "")]
            if not numeric_values:
                continue
            if all(self._is_number(value) for value in numeric_values):
                numeric_columns.append(column)
        return numeric_columns

    def _resolve_task(self, rows: List[Dict[str, str]], numeric_columns: List[str]) -> str:
        if self.task != "auto":
            return self.task
        if self.target in numeric_columns:
            return "regression"
        unique_values = {row.get(self.target, "") for row in rows}
        if len(unique_values) <= 20:
            return "classification"
        return "regression"

    def _build_plan(self, task: str, numeric_columns: List[str]) -> List[str]:
        plan = [
            "Verify target distribution and missing values.",
            "Perform data cleaning (handle missing values, duplicates).",
            "Engineer features (encoding, scaling, interactions).",
            "Split data into train/validation sets.",
            "Train baseline and compare with stronger models.",
            "Document metrics and provide actionable insights.",
        ]
        if task == "classification":
            plan.append("Evaluate class imbalance and consider resampling.")
        if task == "regression" and self.target in numeric_columns:
            plan.append("Check for skewness and apply transformations if needed.")
        return plan

    def _run_baseline(
        self,
        rows: List[Dict[str, str]],
        task: str,
        numeric_columns: List[str],
    ) -> Tuple[Dict[str, float], List[str]]:
        notes: List[str] = []
        target_values = [row.get(self.target, "") for row in rows]
        clean_target_values = [value for value in target_values if value not in (None, "")]

        if not clean_target_values:
            notes.append("Target column contains only missing values; cannot score baseline.")
            return {}, notes

        if task == "classification":
            prediction = self._most_common_value(clean_target_values)
            accuracy = sum(1 for value in clean_target_values if value == prediction) / len(
                clean_target_values
            )
            return {"majority_class_accuracy": round(accuracy, 4)}, notes

        if self.target not in numeric_columns:
            notes.append(
                "Target appears non-numeric; regression baseline not computed."
            )
            return {}, notes

        numeric_targets = [float(value) for value in clean_target_values if self._is_number(value)]
        if not numeric_targets:
            notes.append("No numeric target values found for regression baseline.")
            return {}, notes

        mean_value = statistics.fmean(numeric_targets)
        mae = statistics.fmean(abs(value - mean_value) for value in numeric_targets)
        return {"mean_absolute_error": round(mae, 4)}, notes

    @staticmethod
    def _sniff_delimiter(sample: str) -> str:
        try:
            return csv.Sniffer().sniff(sample).delimiter
        except csv.Error:
            return ","

    @staticmethod
    def _is_number(value: str) -> bool:
        try:
            float(value)
        except ValueError:
            return False
        return True

    @staticmethod
    def _most_common_value(values: List[str]) -> str:
        return max(set(values), key=values.count)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Intelligent data science agent for CSV datasets.")
    parser.add_argument("--data", required=True, help="Path to CSV dataset.")
    parser.add_argument("--target", required=True, help="Target column name.")
    parser.add_argument(
        "--delimiter",
        default=None,
        help="Optional CSV delimiter override (e.g. ',' or ';').",
    )
    parser.add_argument(
        "--task",
        choices=["auto", "classification", "regression"],
        default="auto",
        help="Type of ML task to prioritize.",
    )
    return parser.parse_args()


def render_report(report: AgentReport) -> str:
    lines = [
        "=== Intelligent Data Science Agent Report ===",
        f"Dataset: {report.dataset_path}",
        f"Rows: {report.rows}",
        f"Columns: {', '.join(report.columns)}",
        f"Target: {report.target}",
        f"Task: {report.task}",
        f"Numeric Columns: {', '.join(report.numeric_columns)}",
        "\nMissing Values:",
    ]
    for column, count in report.missing_counts.items():
        lines.append(f"  - {column}: {count}")
    lines.append("\nSuggested Plan:")
    for index, step in enumerate(report.plan, start=1):
        lines.append(f"  {index}. {step}")

    if report.baseline_metrics:
        lines.append("\nBaseline Metrics:")
        for metric, value in report.baseline_metrics.items():
            lines.append(f"  - {metric}: {value}")

    if report.notes:
        lines.append("\nNotes:")
        for note in report.notes:
            lines.append(f"  - {note}")

    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    try:
        data_path = Path(args.data)
        if not data_path.exists():
            raise FileNotFoundError(args.data)
        if data_path.is_dir():
            raise ValueError(f"Dataset path is a directory, not a file: {args.data}")
        agent = DataScienceAgent(
            data_path,
            target=args.target,
            task=args.task,
            delimiter=args.delimiter,
        )
        report = agent.run()
    except FileNotFoundError:
        print(f"Dataset not found: {args.data}", file=sys.stderr)
        sys.exit(2)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(2)
    print(render_report(report))


if __name__ == "__main__":
    main()
