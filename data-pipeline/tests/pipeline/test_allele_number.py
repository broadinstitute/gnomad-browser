import pytest

from data_pipeline.data_types.allele_number import (
    AUTOSOMAL,
    MITOCHONDRIAL,
    X_NON_PAR,
    Y_NON_PAR,
    Y_PAR,
    _stratum_index,
    max_allele_number,
)

# Roughly the v4.1 exome karyotype split, so the numbers below are the ones the
# pipeline actually divides by.
N_XX = 399_053
N_XY = 330_947


def test_max_allele_number_is_diploid_off_the_sex_chromosomes():
    assert max_allele_number(AUTOSOMAL, N_XX, N_XY) == 2 * (N_XX + N_XY)


def test_max_allele_number_accounts_for_haploid_sex_chromosomes():
    # XY samples carry one chrX outside the PAR, and no sample other than an XY
    # sample carries a chrY at all.
    assert max_allele_number(X_NON_PAR, N_XX, N_XY) == 2 * N_XX + N_XY
    assert max_allele_number(Y_NON_PAR, N_XX, N_XY) == N_XY
    assert max_allele_number(Y_PAR, N_XX, N_XY) == 2 * N_XY


def test_max_allele_number_treats_the_mitochondrion_as_haploid():
    # The diploid default would report half the true call rate here.
    assert max_allele_number(MITOCHONDRIAL, N_XX, N_XY) == N_XX + N_XY


def test_max_allele_number_rejects_an_unknown_contig_class():
    with pytest.raises(ValueError):
        max_allele_number("chr1", N_XX, N_XY)


def test_stratum_index_finds_an_exact_match():
    strata = [
        {"group": "adj"},
        {"group": "adj", "sex": "XX"},
        {"group": "adj", "sex": "XY"},
        {"group": "adj", "gen_anc": "afr", "sex": "XX"},
    ]
    assert _stratum_index(strata, {"group": "adj"}) == 0
    assert _stratum_index(strata, {"group": "adj", "sex": "XX"}) == 1
    assert _stratum_index(strata, {"group": "adj", "sex": "XY"}) == 2


def test_stratum_index_does_not_accept_a_containment_match():
    # {"group": "adj"} is contained in both entries below, and in every
    # stratified entry of a real table. A containment match would return index 0
    # for almost any query; failing is the only safe answer.
    strata = [
        {"group": "adj", "gen_anc": "afr"},
        {"group": "adj", "gen_anc": "amr"},
    ]
    with pytest.raises(ValueError):
        _stratum_index(strata, {"group": "adj"})


def test_stratum_index_rejects_missing_and_duplicate_strata():
    with pytest.raises(ValueError):
        _stratum_index([{"group": "adj"}], {"group": "raw"})
    with pytest.raises(ValueError):
        _stratum_index([{"group": "adj"}, {"group": "adj"}], {"group": "adj"})
