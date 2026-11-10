#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::error::Result;
use gnomad_data_store::{
    GeneIndex, GeneIndexEntry, GeneIndexRow, GeneReader, ParquetDataset,
    create_datafusion_context_from_root,
};

mod fixtures;

const NO_LIMIT: usize = 100;

fn row(gene_id: &str, symbol: &str, other_names: &[&str]) -> GeneIndexRow {
    let symbol_upper_case = symbol.to_uppercase();
    let mut search_terms: Vec<String> =
        other_names.iter().map(|name| name.to_uppercase()).collect();
    search_terms.push(symbol_upper_case.clone());
    GeneIndexRow {
        gene_id: gene_id.to_owned(),
        gene_version: "1".to_owned(),
        symbol: symbol.to_owned(),
        symbol_upper_case,
        search_terms,
    }
}

fn symbols(genes: &[&GeneIndexEntry]) -> Vec<String> {
    genes.iter().map(|gene| gene.symbol.clone()).collect()
}

#[test]
fn ranks_exact_symbol_then_symbol_prefix_then_other_names() {
    let index = GeneIndex::new(vec![
        row("ENSG00000000001", "ABCALIAS", &[]),
        row("ENSG00000000002", "XYZ", &["ABC1"]),
        row("ENSG00000000003", "ABC12", &[]),
        row("ENSG00000000004", "ABC", &[]),
    ]);

    assert_eq!(
        symbols(&index.search("ABC", NO_LIMIT)),
        ["ABC", "ABC12", "ABCALIAS", "XYZ"]
    );
}

#[test]
fn breaks_ties_by_shorter_symbol_then_alphabetically_then_gene_id() {
    let index = GeneIndex::new(vec![
        row("ENSG00000000004", "ABD", &[]),
        row("ENSG00000000003", "ABCD", &[]),
        row("ENSG00000000002", "ABC", &[]),
        row("ENSG00000000001", "ABC", &[]),
    ]);

    let gene_ids: Vec<&str> = index
        .search("AB", NO_LIMIT)
        .iter()
        .map(|gene| gene.gene_id.as_str())
        .collect();
    assert_eq!(
        gene_ids,
        [
            "ENSG00000000001",
            "ENSG00000000002",
            "ENSG00000000004",
            "ENSG00000000003"
        ]
    );
}

#[test]
fn returns_each_gene_once_at_its_best_rank() {
    let index = GeneIndex::new(vec![
        row("ENSG00000000001", "ABC", &["ABC1", "ABC-ALIAS"]),
        row("ENSG00000000002", "ABC2", &[]),
    ]);

    assert_eq!(symbols(&index.search("ABC", NO_LIMIT)), ["ABC", "ABC2"]);
}

#[test]
fn ignores_case_and_surrounding_whitespace() {
    let index = GeneIndex::new(vec![row("ENSG00000000001", "PCSK9", &["NARC-1"])]);

    assert_eq!(symbols(&index.search("  pcsk ", NO_LIMIT)), ["PCSK9"]);
    assert_eq!(symbols(&index.search("narc", NO_LIMIT)), ["PCSK9"]);
}

#[test]
fn returns_nothing_for_an_empty_query_or_no_match() {
    let index = GeneIndex::new(vec![row("ENSG00000000001", "PCSK9", &[])]);

    for query in ["", "   ", "TST"] {
        let results = index.search(query, NO_LIMIT);
        assert!(results.is_empty(), "query {query:?} matched {results:?}");
    }
}

#[test]
fn looks_up_ensembl_gene_ids_exactly() {
    let index = GeneIndex::new(vec![
        row("ENSG00000000001", "FIRST", &[]),
        row("ENSG00000000012", "SECOND", &[]),
    ]);

    assert_eq!(
        symbols(&index.search("ensg00000000001", NO_LIMIT)),
        ["FIRST"]
    );
    for query in ["ENSG00000000099", "ENSG0000000001", "ENSG00000000001.1"] {
        let results = index.search(query, NO_LIMIT);
        assert!(results.is_empty(), "query {query:?} matched {results:?}");
    }
}

#[test]
fn stops_at_the_limit() {
    let index = GeneIndex::new(vec![
        row("ENSG00000000001", "ABC1", &[]),
        row("ENSG00000000002", "ABC2", &[]),
        row("ENSG00000000003", "ABC3", &[]),
    ]);

    assert_eq!(symbols(&index.search("ABC", 2)), ["ABC1", "ABC2"]);
    let results = index.search("ABC", 0);
    assert!(results.is_empty(), "limit 0 returned {results:?}");
}

#[test]
fn indexes_the_current_symbol_even_when_search_terms_omit_it() {
    let index = GeneIndex::new(vec![GeneIndexRow {
        gene_id: "ENSG00000000001".to_owned(),
        gene_version: "1".to_owned(),
        symbol: "PCSK9".to_owned(),
        symbol_upper_case: "PCSK9".to_owned(),
        search_terms: vec!["NARC-1".to_owned()],
    }]);

    assert_eq!(symbols(&index.search("PCSK9", NO_LIMIT)), ["PCSK9"]);
}

#[tokio::test]
async fn searches_genes_loaded_from_the_real_export() -> Result<()> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::GeneModelsGrch38,
    )
    .await?;
    let index = GeneReader::new(context).load_gene_index().await?;

    assert_eq!(symbols(&index.search("T", NO_LIMIT)), ["TST", "TTTY6B"]);
    assert_eq!(symbols(&index.search("narc", NO_LIMIT)), ["PCSK9"]);
    let pcsk9 = index.search("ENSG00000169174", NO_LIMIT);
    assert_eq!(
        pcsk9,
        [&GeneIndexEntry {
            gene_id: "ENSG00000169174".to_owned(),
            gene_version: "11".to_owned(),
            symbol: "PCSK9".to_owned(),
        }]
    );
    Ok(())
}
