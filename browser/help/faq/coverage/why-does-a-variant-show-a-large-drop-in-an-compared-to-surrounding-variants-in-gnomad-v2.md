---
question: 'Why does a variant show a large drop in AN compared to surrounding variants in gnomAD v2?'
---

Sometimes a large apparent drop in AN can occur because a variant was called in only genome samples. If surrounding variants were called in exomes or both exomes and genomes, the AN values for these variants are higher, making it appear that there is a sudden drop and rise in AN. Although the AN is likely consistently high across the given region for exomes, if we only have explicit variant calls for the genome data, we can only speak to our reference confidence for those samples.
