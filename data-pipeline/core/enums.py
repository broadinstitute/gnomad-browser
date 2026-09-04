from enum import Enum


# Subclass `(str, Enum)` rather than `enum.StrEnum`: StrEnum is added in Python 3.11,
# and the data pipeline targets Python 3.9.
class ReferenceGenome(str, Enum):
    GRCh37 = "GRCh37"
    GRCh38 = "GRCh38"


class DataType(str, Enum):
    EXOMES = "exomes"
    GENOMES = "genomes"
