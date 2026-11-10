use std::cmp::Ordering;
use std::collections::{BTreeSet, HashMap};

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct GeneIndexRow {
    pub gene_id: String,
    pub gene_version: String,
    pub symbol: String,
    pub symbol_upper_case: String,
    pub search_terms: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GeneIndexEntry {
    pub gene_id: String,
    pub gene_version: String,
    pub symbol: String,
}

/// Lower variants rank first in search results.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum SearchRank {
    CurrentSymbolEquals,
    CurrentSymbolStartsWith,
    OtherNameStartsWith,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TermKind {
    CurrentSymbol,
    OtherName,
}

#[derive(Debug)]
struct IndexedTerm {
    term: String,
    kind: TermKind,
    gene_position: usize,
}

/// Every gene's identifiers and names, held in memory so search never reads Parquet.
#[derive(Debug)]
pub struct GeneIndex {
    genes: Vec<GeneIndexEntry>,
    gene_positions_by_id: HashMap<String, usize>,
    terms_in_order: Vec<IndexedTerm>,
}

impl GeneIndex {
    #[must_use]
    pub fn new(rows: Vec<GeneIndexRow>) -> Self {
        let mut genes = Vec::with_capacity(rows.len());
        let mut gene_positions_by_id = HashMap::with_capacity(rows.len());
        let mut terms_in_order = Vec::new();

        for (gene_position, row) in rows.into_iter().enumerate() {
            let mut terms: BTreeSet<String> = row.search_terms.into_iter().collect();
            terms.insert(row.symbol_upper_case.clone());
            terms_in_order.extend(terms.into_iter().map(|term| {
                let kind = if term == row.symbol_upper_case {
                    TermKind::CurrentSymbol
                } else {
                    TermKind::OtherName
                };
                IndexedTerm {
                    term,
                    kind,
                    gene_position,
                }
            }));
            gene_positions_by_id.insert(row.gene_id.clone(), gene_position);
            genes.push(GeneIndexEntry {
                gene_id: row.gene_id,
                gene_version: row.gene_version,
                symbol: row.symbol,
            });
        }

        terms_in_order.sort_unstable_by(|left, right| left.term.cmp(&right.term));
        Self {
            genes,
            gene_positions_by_id,
            terms_in_order,
        }
    }

    /// Match `ENSG` plus 11 digits as an exact gene ID, and anything else as a case-insensitive
    /// prefix of a gene's current symbol or other names; return at most `limit` genes, best
    /// match first.
    #[must_use]
    pub fn search(&self, query: &str, limit: usize) -> Vec<&GeneIndexEntry> {
        let query = query.trim().to_uppercase();
        if query.is_empty() {
            return Vec::new();
        }
        if is_ensembl_gene_id(&query) {
            return self
                .gene_positions_by_id
                .get(&query)
                .and_then(|&position| self.genes.get(position))
                .into_iter()
                .collect();
        }

        let mut best_rank_by_gene_position: HashMap<usize, SearchRank> = HashMap::new();
        let first_candidate = self
            .terms_in_order
            .partition_point(|indexed| indexed.term.as_str() < query.as_str());
        for indexed in self
            .terms_in_order
            .iter()
            .skip(first_candidate)
            .take_while(|indexed| indexed.term.starts_with(&query))
        {
            let rank = match indexed.kind {
                TermKind::CurrentSymbol if indexed.term == query => SearchRank::CurrentSymbolEquals,
                TermKind::CurrentSymbol => SearchRank::CurrentSymbolStartsWith,
                TermKind::OtherName => SearchRank::OtherNameStartsWith,
            };
            best_rank_by_gene_position
                .entry(indexed.gene_position)
                .and_modify(|best| *best = (*best).min(rank))
                .or_insert(rank);
        }

        let mut matches: Vec<(SearchRank, &GeneIndexEntry)> = best_rank_by_gene_position
            .into_iter()
            .filter_map(|(position, rank)| self.genes.get(position).map(|gene| (rank, gene)))
            .collect();
        matches.sort_unstable_by(|(left_rank, left), (right_rank, right)| {
            left_rank
                .cmp(right_rank)
                .then_with(|| compare_by_symbol_then_id(left, right))
        });
        matches
            .into_iter()
            .take(limit)
            .map(|(_, gene)| gene)
            .collect()
    }
}

fn compare_by_symbol_then_id(left: &GeneIndexEntry, right: &GeneIndexEntry) -> Ordering {
    left.symbol
        .len()
        .cmp(&right.symbol.len())
        .then_with(|| left.symbol.cmp(&right.symbol))
        .then_with(|| left.gene_id.cmp(&right.gene_id))
}

fn is_ensembl_gene_id(upper_case_query: &str) -> bool {
    upper_case_query.strip_prefix("ENSG").is_some_and(|digits| {
        digits.len() == 11 && digits.bytes().all(|byte| byte.is_ascii_digit())
    })
}
