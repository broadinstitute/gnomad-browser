-- Materialized view for pre-aggregated methylation summary statistics.
-- Uses AggregatingMergeTree to maintain running averages incrementally
-- as new rows are inserted into lr_methylation.
--
-- Query with *Merge combinators:
--   SELECT pos1, pos2,
--          avgMerge(mean_methylation_state) AS mean_methylation,
--          avgMerge(mean_coverage_state) AS mean_coverage,
--          countMerge(num_samples_state) AS num_samples,
--          sqrt(varPopMerge(var_methylation_state)) AS std_methylation
--   FROM lr_methylation_summary_mv
--   WHERE chrom = 'chr22' AND pos1 BETWEEN 20000000 AND 21000000
--   GROUP BY pos1, pos2
--   ORDER BY pos1

CREATE MATERIALIZED VIEW IF NOT EXISTS lr_methylation_summary_mv
ENGINE = AggregatingMergeTree()
ORDER BY (chrom, pos1)
AS SELECT
    chrom,
    pos1,
    pos2,
    avgState(methylation) AS mean_methylation_state,
    avgState(coverage) AS mean_coverage_state,
    countState() AS num_samples_state,
    varPopState(methylation) AS var_methylation_state
FROM lr_methylation
GROUP BY chrom, pos1, pos2;
