#!/usr/bin/env python3

import argparse
import dataclasses
import json
import sys
import typing


SITE_QUALITY_ALLELE_FREQUENCY_BINS = [
    ("0", "0.00005"),
    ("0.00005", "0.0001"),
    ("0.0001", "0.0002"),
    ("0.0002", "0.0005"),
    ("0.0005", "0.001"),
    ("0.001", "0.002"),
    ("0.002", "0.005"),
    ("0.005", "0.01"),
    ("0.01", "0.02"),
    ("0.02", "0.05"),
    ("0.05", "0.1"),
    ("0.1", "0.2"),
    ("0.2", "0.5"),
    ("0.5", "1"),
]


@dataclasses.dataclass
class Histogram:
    bin_edges: typing.List[float]
    bin_freq: typing.List[int]
    n_smaller: int
    n_larger: int


def scale_histogram_bins(histogram: Histogram) -> Histogram:
    return dataclasses.replace(
        histogram, bin_edges=[10 ** n for n in histogram.bin_edges]
    )


OTHER_METRICS_TO_SCALE = ["DP"]


@dataclasses.dataclass
class MetricHistogram(Histogram):
    metric: str

    def histogram(self) -> Histogram:
        hist = Histogram(
            bin_edges=self.bin_edges,
            bin_freq=self.bin_freq,
            n_smaller=self.n_smaller,
            n_larger=self.n_larger,
        )

        if self.metric.startswith("binned_") or self.metric in OTHER_METRICS_TO_SCALE:
            hist = scale_histogram_bins(hist)

        return dataclasses.asdict(hist)


def empty_site_quality_histogram():
    return dataclasses.asdict(
        scale_histogram_bins(
            Histogram(
                bin_edges=[1 + i * 0.25 for i in range(37)],
                bin_freq=[0] * 36,
                n_smaller=0,
                n_larger=0,
            )
        )
    )


METRIC_ALIAS = {"rf_tp_probability": "RF"}


def format_quality_metric_distributions(metrics: typing.List[MetricHistogram]):
    site_quality_metrics = [m for m in metrics if m.metric.startswith("binned_")]
    other_metrics = [m for m in metrics if not m.metric.startswith("binned_")]

    site_quality_metrics_by_metric = {m.metric: m for m in site_quality_metrics}

    return {
        "siteQuality": {
            "singleton": site_quality_metrics_by_metric["binned_singleton"].histogram(),
            "doubleton": site_quality_metrics_by_metric["binned_doubleton"].histogram(),
            "af_bins": [
                {
                    "min_af": b[0],
                    "max_af": b[1],
                    "histogram": site_quality_metrics_by_metric[
                        f"binned_{b[1]}"
                    ].histogram()
                    if site_quality_metrics_by_metric.get(f"binned_{b[1]}")
                    else empty_site_quality_histogram(),
                }
                for b in SITE_QUALITY_ALLELE_FREQUENCY_BINS
            ],
        },
        "otherMetrics": [
            {"metric": METRIC_ALIAS.get(m.metric, m.metric), "histogram": m.histogram()}
            for m in other_metrics
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exome-file")
    parser.add_argument("--genome-file")

    args = parser.parse_args()

    if not args.exome_file and not args.genome_file:
        print("At least one of --exome-file and --genome-file is required", file=sys.stderr)
        sys.exit(1)

    metrics = {}

    for sample_set in ["exome", "genome"]:
        metrics_file_path = getattr(args, f"{sample_set}_file", None)
        if metrics_file_path:
            with open(metrics_file_path) as metrics_file:
                sample_set_metrics = [MetricHistogram(**m) for m in json.load(metrics_file)]
                sample_set_metrics = format_quality_metric_distributions(sample_set_metrics)
                metrics[sample_set] = sample_set_metrics

    return metrics


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
