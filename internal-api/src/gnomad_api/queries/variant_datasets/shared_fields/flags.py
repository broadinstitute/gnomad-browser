LOF_CONSEQUENCE_TERMS = set(
    ["transcript_ablation", "splice_acceptor_variant", "splice_donor_variant", "stop_gained", "frameshift_variant",]
)

# "NC" was removed from the data pipeline some time ago, but some ExAC variants still have it.
def is_lof_on_non_coding_transcript(transcript_consequence):
    return (
        transcript_consequence["major_consequence"] in LOF_CONSEQUENCE_TERMS and not transcript_consequence["lof"]
    ) or transcript_consequence["lof"] == "NC"


def get_flags(variant):
    flags = variant.get("flags", [])

    all_consequences = variant.get("transcript_consequences", [])
    lof_consequences = [csq for csq in all_consequences if csq["lof"]]
    most_severe_consequence = all_consequences[0]

    if lof_consequences:
        # In some cases, a coding transcript with a non-pLoF VEP annotation may be ranked higher
        # than a non-coding transcript with a pLoF VEP annotation. LOFTEE does not annotate
        # non-coding transcripts. Check for most_severe_consequence.lof to avoid showing an
        # LC pLoF flag next to a non-pLoF VEP consequence.
        if not any(csq["lof"] == "HC" for csq in lof_consequences) and most_severe_consequence["lof"]:
            flags.append("lc_lof")

        if all(csq["lof_flags"] for csq in lof_consequences):
            flags.append("lof_flag")

    if most_severe_consequence:
        if is_lof_on_non_coding_transcript(most_severe_consequence):
            # See https://github.com/broadinstitute/gnomad-browser/issues/364
            flags.append("nc_transcript")

        if most_severe_consequence["lof"] == "OS":
            flags.append("os_lof")

    return flags
