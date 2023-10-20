---
question: 'What is a LOEUF score?'
---

For the definition of the LOEUF score and appropriate uses see our [constraint section](/help/constraint#loeuf).

LOEUF stands for the "loss-of-function observed/expected upper bound fraction." It is a conservative estimate of the observed/expected ratio, based on the upper bound of a Poisson-derived confidence interval around the ratio. Low LOEUF scores indicate strong selection against predicted loss-of-function (pLoF) variation in a given gene, while high LOEUF scores suggest a relatively higher tolerance to inactivation. Its advantage over pLI is that it can be used as a continuous value rather than a dichotomous scale (e.g. pLI > 0.9) - if such a single cutoff is still desired, pLI is a perfectly fine metric to use. At large sample sizes, the observed/expected ratio will be a more appropriate measure for selection, but at the moment, LOEUF provides a good compromise of point estimate and significance measure.
