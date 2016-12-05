# gnomAD GraphQL API

The [GraphQL](http://graphql.org/) specification describes an elegant new way to fetch data on the web. GraphQL APIs are similar to a RESTful APIs, but rather than querying with URL parameters, you precisely defined the data you would like to fetch using a simple query language. The GraphQL specification is already being embraced by companies like [Github, Facebook, and Pintrest](http://graphql.org/users/).

Since the gnomAD VCF files may be prohibitively large to download, this API provides a quick way to programmatically retrieve specific data of interest in JSON format. Below, we demonstrate how to interactively explore the API and build queries in the [GraphiQL browser](https://github.com/graphql/graphiql) and then use these queries to fetch data in the Python, R, and JavaScript languages.

Please note that this resource is under development and the query methods and data types described are subject to frequent change. We would love to hear your [feedback](exomeconsortium@gmail.com).

## Getting started

To get comfortable building queries, check out the [official guide](http://graphql.org/learn/queries/) and follow along by executing the queries yourself using the [Star Wars GraphiQL API](https://graphql-swapi.parseapp.com/). It may be useful to spend a few minutes doing that before proceeding.

To get started with gnomAD data, open the interactive query building editor at [gnomad.broadinstitute.org/graph](http://gnomad.broadinstitute.org:8000/graph). You should see two panels side-by-side. Build queries in the left panel and the results will be displayed in the right panel.

Click the `Docs` button in the top right-hand corner to open up the Documentation Explorer. GraphQL is self-documenting, so the data types in the docs are always up-to-date. The Documentation Explorer Under `ROOT TYPES`, click on `query: Root` and you will shown the different ways to start building queries.

```graphql
gene(gene_id: String!): Gene
```

### Query by gene

Let's start by building a query that retrieves all the exome and genome variants
in a given gene using the `gene` field.

```graphql
gene(gene_id: String!): Gene
```

This that it takes one argument called `gene_id` that is a type `String`. The `!` means this argument is required. The `: Gene` means this field is of type `Gene`.

The GraphiQL editor has auto completion and error checking. In the blank left panel, start by typing curly braces `{  }` and then `control-shift`. You should see autocomplete fields pop up. Select `gene` from the autocomplete menu, and this should now autocomplete to `{  gene }`. Notice how `gene` has a squiggly red underline. This means the interpreter is complaining about something. Hover over the exception to see what is wrong.

The error message says..

The field wants an argument and type `Gene` requires a subfield, so modify the query:

```graphql
{ gene(gene_id: "ENSG00000186951") }
```

Press the Play button at the top of the screen or type `shift-enter`.  You should see more fields populate the query. Press the `Prettify` button to make the query look a bit nicer.

```graphql
{
  gene(gene_id: "ENSG00000186951") {
    _id
    omim_description
    stop
    gene_id
    omim_accession
    chrom
    strand
    full_gene_name
    gene_name_upper
    other_names
    canonical_transcript
    start
    xstop
    xstart
    gene_name
  }
}
```

What happened? All of the top level fields of the `Gene` type have automatically been added. Also, the query was sent to the server end the JSON response was returned. You've successfully retrieved data from the gnomAD API! Observe how the GraphQL query looks a lot like JSON but with fields and no values. The shape of the json object mirrors the query:

```json
{
  "data": {
    "gene": {
      "_id": "5814afa729736fbf482f1611",
      "omim_description": " PEROXISOME PROLIFERATOR-ACTIVATED RECEPTOR-ALPHA; PPARA",
      "stop": "46639654",
      "gene_id": "ENSG00000186951",
      "omim_accession": "170998",
      "chrom": "22",
      "strand": "+",
      "full_gene_name": "peroxisome proliferator-activated receptor alpha",
      "gene_name_upper": "PPARA",
      "other_names": [
        "PPAR",
        "HPPAR",
        "NR1C1"
      ],
      "canonical_transcript": "ENST00000396000",
      "start": 46546425,
      "xstop": null,
      "xstart": "22046546425",
      "gene_name": "PPARA"
    }
  }
}
```

In the Documentation Explorer, click the `Gene` type. You will see all of the fields for this type here. Notice that some of them have not automatically filled in, such as `exome_variants` or `exome_coverage`. Since these are arrays of type `[Variant]` and `[Coverage]`, respectively, they will not automatically populate because there could be a significant amount of data in these fields. Try adding the `exome_variants` by going back the query and adding this field. Start typing `exome`, and finish with auto completion. Press the play button again or `shift-return`. All of the `Variant` fields in the array under the `exome_variants` field will be added:

```graphql
{
  gene(gene_id: "ENSG00000186951") {
    _id
    omim_description
    stop
    gene_id
    omim_accession
    chrom
    strand
    full_gene_name
    gene_name_upper
    other_names
    canonical_transcript
    start
    xstop
    xstart
    gene_name
    exome_variants {
      _id
      ac_female
      ac_male
      allele_count
      allele_freq
      allele_num
      alt
      an_female
      an_male
      chrom
      filter
      genes
      genotype_depths
      genotype_qualities
      hom_count
      orig_alt_alleles
      pos
      ref
      rsid
      site_quality
      transcripts
      variant_id
      xpos
      xstart
      xstop
    }
  }
}
```

On the right-hand side of the page, a lot of data was returned from this query. There are over a 1000 variants, so you may decide you don't need some of the fields by deleting unnecessary fields in the query. For example, let's say you only care about allele fields and the filter status, the query can be simplified like so:

```graphql
{
  gene(gene_id: "ENSG00000186951") {
    gene_name
    exome_variants {
      allele_count
      allele_freq
      allele_num
      filter
      variant_id

    }
  }
}
```

The JSON object response will look like:

```json
{
  "data": {
    "gene": {
      "gene_name": "PPARA",
      "exome_variants": [
        {
          "allele_count": 1,
          "allele_freq": 0.000008314625426124552,
          "allele_num": 120270,
          "filter": "PASS",
          "variant_id": "22-46594230-T-A"
        },
        {
          "allele_count": 1,
          "allele_freq": 0.000008324731111185109,
          "allele_num": 120124,
          "filter": "PASS",
          "variant_id": "22-46594236-C-T"
        },
        {
          "allele_count": 1,
          "allele_freq": 0.000008321821480285606,
          "allele_num": 120166,
          "filter": "PASS",
          "variant_id": "22-46594241-G-T"
        }
        ...etc.
      ]
    }
  }
}    
```

Let's say you are interested in some of the VEP annotations for each variant, the mean coverage across the gene, and the exons for that gene, and you want information for both exome and genome data. The query would be:

```graphql
{
  gene(gene_id: "ENSG00000186951") {
    gene_name
    exome_variants {
      allele_count
      allele_freq
      allele_num
      filter
      variant_id
      vep_annotations {
        HGVSc
        Feature
      }
    }
    exome_coverage {
      pos
      mean
    }
    genome_variants {
      allele_count
      allele_freq
      allele_num
      filter
      variant_id
      vep_annotations {
        HGVSc
        Feature
      }
    }
    genome_coverage {
      pos
      mean
    }
    exons {
      _id
      start
      transcript_id
      feature_type
      stop
    }
  }
}
```

In general, take advantage of the Documentation Explorer and autocomplete to inspect the available types for each field. Experiment with building queries in the GraphiQL editor before deciding to use them in your script or application. Tuning queries such that you only get the data you're interested in can speed up fetching time and decrease file size/data complexity.

### Query by variant

### Query by region

### Fetching data with Python

### Fetching data with R

### Fetching data with JavaScript

This could be useful for building web applications that consume gnomAD data. To fetch data in JavaScript, you could write something that looks like this:

```javascript
const API_URL = `gnomad.broadinstitute.org/graph`
const geneId = `ENSG00000186951`
const query = `
  {
    gene(gene_id: "${geneId}") {
      gene_id
      gene_name
      start
      stop
      exome_variants {
        variant_id
        allele_num
        allele_freq
        allele_count
      }
    }
  }
`
fetch(API_URL)(query).then(data => console.log(data))
```
