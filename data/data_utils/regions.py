import hail as hl


def merge_overlapping_regions(regions):
    return hl.cond(
        hl.len(regions) > 1,
        hl.rbind(
            hl.sorted(regions, lambda region: region.start),
            lambda sorted_regions: sorted_regions[1:].fold(
                lambda acc, region: hl.cond(
                    region.start <= acc[-1].stop + 1,
                    acc[:-1].append(acc[-1].annotate(stop=hl.max(region.stop, acc[-1].stop))),
                    acc.append(region),
                ),
                [sorted_regions[0]],
            ),
        ),
        regions,
    )
