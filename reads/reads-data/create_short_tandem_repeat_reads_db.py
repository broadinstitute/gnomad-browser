import argparse
import gzip
import json
import os
import sqlite3


def create_short_tandem_repeat_reads_db(input_path, output_path):
    if input_path.startswith("gs://"):
        import hail as hl

        open_file = hl.hadoop_open
    else:
        open_file = gzip.open if input_path.endswith(".gz") else open

    with open_file(input_path) as input_file:
        reads_data = json.load(input_file)

    if os.path.exists(output_path):
        raise Exception(f"{output_path} already exists")

    db = sqlite3.connect(output_path)
    db.execute(
        """
        CREATE TABLE `reads` (
            `id` text,
            `order` integer,
            `n_alleles` integer,
            `allele_1_repeat_unit` text,
            `allele_2_repeat_unit` text,
            `allele_1_repeats` integer,
            `allele_1_repeats_ci_lower` integer,
            `allele_1_repeats_ci_upper` integer,
            `allele_2_repeats` integer,
            `allele_2_repeats_ci_lower` integer,
            `allele_2_repeats_ci_upper` integer,
            `population` text,
            `sex` text,
            `age` text,
            `filename` text
        )
        """
    )

    db.execute("CREATE INDEX `id_idx` ON `reads` (`id`)")

    def _format_read(read, index, locus):
        # Hemizygotes have only one allele and only one value in Genotype/GenotypeConfidenceInterval
        if "/" in read["Genotype"]:
            n_alleles = 2
            allele_1_repeat_unit = read["Allele1Motif"]
            allele_2_repeat_unit = read["Allele2Motif"]
            allele_1_repeats, allele_2_repeats = map(int, read["Genotype"].split("/"))
            allele_1_ci, allele_2_ci = read["GenotypeConfidenceInterval"].split("/")
            allele_1_ci_lower, allele_1_ci_upper = map(int, allele_1_ci.split("-"))
            allele_2_ci_lower, allele_2_ci_upper = map(int, allele_2_ci.split("-"))
        else:
            n_alleles = 1
            allele_1_repeat_unit = read["Allele1Motif"]
            allele_2_repeat_unit = None
            allele_1_repeats = int(read["Genotype"])
            allele_2_repeats = None
            allele_1_ci_lower, allele_1_ci_upper = map(int, read["GenotypeConfidenceInterval"].split("-"))
            allele_2_ci_lower = allele_2_ci_upper = None

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
            "filename": read["ReadvizFilename"],
        }

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
                :filename
            )
            """,
            (_format_read(read, index, locus) for index, read in enumerate(reads)),
        )
        db.commit()

    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path", help="Path to STR readviz paths JSON file")
    parser.add_argument("output_path", help="Destination for SQLite database")
    args = parser.parse_args()
    create_short_tandem_repeat_reads_db(**vars(args))
