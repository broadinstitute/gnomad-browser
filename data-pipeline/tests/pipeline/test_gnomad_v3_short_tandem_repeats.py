import unittest

from data_pipeline.datasets.gnomad_v3.gnomad_v3_short_tandem_repeats import (
    _parse_allele_count_histogram_section,
    _parse_allele_scatter_plot_histogram_section,
)


class ParseHistogramSectionQualityDescriptionTests(unittest.TestCase):
    def test_genotype_distribution_lowercases_the_quality_the_way_the_allele_size_distribution_does(self):
        # The source file spells this quality "medium-Low"
        genotype_section = _parse_allele_scatter_plot_histogram_section("nfe/XY/CAG/CAG/medium-Low/0.3", {"12/12": 1})
        allele_size_section = _parse_allele_count_histogram_section("nfe/XY/CAG/medium-Low/0.3", {"12": 2})

        self.assertEqual(genotype_section["quality_description"], "medium-low")
        self.assertEqual(allele_size_section["quality_description"], "medium-low")


if __name__ == "__main__":
    unittest.main()
