#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Chromosome {
    Chr1,
    Chr2,
    Chr3,
    Chr4,
    Chr5,
    Chr6,
    Chr7,
    Chr8,
    Chr9,
    Chr10,
    Chr11,
    Chr12,
    Chr13,
    Chr14,
    Chr15,
    Chr16,
    Chr17,
    Chr18,
    Chr19,
    Chr20,
    Chr21,
    Chr22,
    ChrX,
    ChrY,
    ChrM,
}

#[derive(Debug, PartialEq, Eq)]
pub struct GenomicInterval {
    chromosome: Chromosome,
    start: i32,
    stop: i32,
}

impl std::str::FromStr for Chromosome {
    type Err = GenomicIntervalError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "1" => Ok(Self::Chr1),
            "2" => Ok(Self::Chr2),
            "3" => Ok(Self::Chr3),
            "4" => Ok(Self::Chr4),
            "5" => Ok(Self::Chr5),
            "6" => Ok(Self::Chr6),
            "7" => Ok(Self::Chr7),
            "8" => Ok(Self::Chr8),
            "9" => Ok(Self::Chr9),
            "10" => Ok(Self::Chr10),
            "11" => Ok(Self::Chr11),
            "12" => Ok(Self::Chr12),
            "13" => Ok(Self::Chr13),
            "14" => Ok(Self::Chr14),
            "15" => Ok(Self::Chr15),
            "16" => Ok(Self::Chr16),
            "17" => Ok(Self::Chr17),
            "18" => Ok(Self::Chr18),
            "19" => Ok(Self::Chr19),
            "20" => Ok(Self::Chr20),
            "21" => Ok(Self::Chr21),
            "22" => Ok(Self::Chr22),
            "X" => Ok(Self::ChrX),
            "Y" => Ok(Self::ChrY),
            "M" => Ok(Self::ChrM),
            _ => Err(GenomicIntervalError::InvalidChromosome),
        }
    }
}

impl Chromosome {
    #[must_use]
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Chr1 => "1",
            Self::Chr2 => "2",
            Self::Chr3 => "3",
            Self::Chr4 => "4",
            Self::Chr5 => "5",
            Self::Chr6 => "6",
            Self::Chr7 => "7",
            Self::Chr8 => "8",
            Self::Chr9 => "9",
            Self::Chr10 => "10",
            Self::Chr11 => "11",
            Self::Chr12 => "12",
            Self::Chr13 => "13",
            Self::Chr14 => "14",
            Self::Chr15 => "15",
            Self::Chr16 => "16",
            Self::Chr17 => "17",
            Self::Chr18 => "18",
            Self::Chr19 => "19",
            Self::Chr20 => "20",
            Self::Chr21 => "21",
            Self::Chr22 => "22",
            Self::ChrX => "X",
            Self::ChrY => "Y",
            Self::ChrM => "M",
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum GenomicIntervalError {
    InvalidChromosome,
    NonPositiveStart,
    StopBeforeStart,
}

impl std::fmt::Display for GenomicIntervalError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let message = match self {
            Self::InvalidChromosome => "chromosome must be one of 1-22, X, Y or M",
            Self::NonPositiveStart => "start must be at least 1",
            Self::StopBeforeStart => "stop must not be before start",
        };
        formatter.write_str(message)
    }
}

impl std::error::Error for GenomicIntervalError {}

impl GenomicInterval {
    /// # Errors
    /// If chromosome is invalid, if start is non-positive, or if stop is before start
    pub fn new(chromosome: &str, start: i32, stop: i32) -> Result<Self, GenomicIntervalError> {
        let chromosome = chromosome.parse::<Chromosome>()?;

        if start < 1 {
            return Err(GenomicIntervalError::NonPositiveStart);
        }

        if stop < start {
            return Err(GenomicIntervalError::StopBeforeStart);
        }

        Ok(Self {
            chromosome,
            start,
            stop,
        })
    }

    #[must_use]
    pub const fn chromosome(&self) -> Chromosome {
        self.chromosome
    }

    #[must_use]
    pub const fn start(&self) -> i32 {
        self.start
    }

    #[must_use]
    pub const fn stop(&self) -> i32 {
        self.stop
    }
}
