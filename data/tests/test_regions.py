import pytest
import hail as hl

from data_utils.regions import merge_overlapping_regions


@pytest.mark.parametrize(
    "input_regions,expected_output_regions",
    [
        (
            hl.literal(
                [
                    hl.utils.Struct(start=5, stop=10),
                    hl.utils.Struct(start=7, stop=12),
                    hl.utils.Struct(start=10, stop=11),
                ]
            ),
            [hl.utils.Struct(start=5, stop=12)],
        ),
        (
            hl.literal(
                [
                    hl.utils.Struct(start=5, stop=10),
                    hl.utils.Struct(start=11, stop=14),
                    hl.utils.Struct(start=17, stop=22),
                    hl.utils.Struct(start=22, stop=24),
                ]
            ),
            [
                hl.utils.Struct(start=5, stop=14),
                hl.utils.Struct(start=17, stop=24),
            ],
        ),
        (hl.empty_array(hl.tstruct(start=hl.tint, stop=hl.tint)), []),
    ],
)
def test_merge_overlapping_regions(input_regions, expected_output_regions):
    assert hl.eval(merge_overlapping_regions(input_regions)) == expected_output_regions
