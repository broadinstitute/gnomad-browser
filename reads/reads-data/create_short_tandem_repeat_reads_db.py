import argparse
import os
import sqlite3
from collections import defaultdict
import json


def _format_read(read, index, locus):
    # Hemizygotes have only one allele and only one value in Genotype/GenotypeConfidenceInterval
    if "/" in read["Genotype"]:
        n_alleles = 2
        allele_1_repeats, allele_2_repeats = map(int, read["Genotype"].split("/"))
        allele_1_ci, allele_2_ci = read["GenotypeConfidenceInterval"].split("/")
        allele_1_ci_lower, allele_1_ci_upper = map(int, allele_1_ci.split("-"))
        allele_2_ci_lower, allele_2_ci_upper = map(int, allele_2_ci.split("-"))
    else:
        n_alleles = 1
        allele_1_repeats = int(read["Genotype"])
        allele_2_repeats = None
        allele_1_ci_lower, allele_1_ci_upper = map(int, read["GenotypeConfidenceInterval"].split("-"))
        allele_2_ci_lower = allele_2_ci_upper = None

    allele_1_repeat_unit = read["Allele1Motif"]
    allele_2_repeat_unit = read["Allele2Motif"]

    return {
        "id": locus,
        "order": index,
        "n_alleles": n_alleles,
        "allele_1_repeat_unit": allele_1_repeat_unit,
        "allele_2_repeat_unit": allele_2_repeat_unit,
        "allele_1_repeats": allele_1_repeats,
        "allele_1_repeats_ci_lower": allele_1_ci_lower,
        "allele_1_repeats_ci_upper": allele_1_ci_upper,
        "allele_2_repeats": allele_2_repeats,
        "allele_2_repeats_ci_lower": allele_2_ci_lower,
        "allele_2_repeats_ci_upper": allele_2_ci_upper,
        "population": read["Population"],
        "sex": read["Sex"],
        "age": None if read["Age"] == "age_not_available" else read["Age"],
        "pcr_protocol": read["PcrProtocol"],
        "filename": read["ReadvizFilename"] or None,
        "q": read["Q"],
        # some quality_description values in the raw data have odd capitalization, so we lowercase it
        "quality_description": read["ManualReviewGenotypeQualitySummary"].lower(),
    }


def create_short_tandem_repeat_reads_db(input_path, output_path):
    if os.path.exists(output_path):
        raise Exception(f"{output_path} already exists")

    input_file = open(input_path)
    reads_data = json.loads(input_file.read())

    db = sqlite3.connect(output_path)
    db.execute(
        """
        CREATE TABLE `reads` (
            `id` varchar(10),
            `order` integer,
            `n_alleles` integer,
            `allele_1_repeat_unit` varchar(24),
            `allele_2_repeat_unit` varchar(24),
            `allele_1_repeats` integer,
            `allele_1_repeats_ci_lower` integer,
            `allele_1_repeats_ci_upper` integer,
            `allele_2_repeats` integer,
            `allele_2_repeats_ci_lower` integer,
            `allele_2_repeats_ci_upper` integer,
            `population` char(3),
            `sex` char(2),
            `age` varchar(17),
            `pcr_protocol` char(8),
            `filename` char(47),
            `q` double,
            `quality_description` varchar(12)
        )
        """
    )

    db.execute("CREATE INDEX `id_idx` ON `reads` (`id`)")
    for locus, reads in reads_data.items():
        db.executemany(
            """
            INSERT INTO `reads` VALUES (
                :id,
                :order,
                :n_alleles,
                :allele_1_repeat_unit,
                :allele_2_repeat_unit,
                :allele_1_repeats,
                :allele_1_repeats_ci_lower,
                :allele_1_repeats_ci_upper,
                :allele_2_repeats,
                :allele_2_repeats_ci_lower,
                :allele_2_repeats_ci_upper,
                :population,
                :sex,
                :age,
                :pcr_protocol,
                :filename,
                :q,
                :quality_description
            )
            """,
            (_format_read(read, index, locus) for index, read in enumerate(reads)),
        )
        db.commit()

    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path", help="Path to STR readviz paths TSV file")
    parser.add_argument("output_path", help="Destination for SQLite database")
    args = parser.parse_args()
    create_short_tandem_repeat_reads_db(**vars(args))
