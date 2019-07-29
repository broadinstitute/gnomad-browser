import os
import pandas as pd

RESOURCES_PATH = '/Users/msolomon/gnomadjs/resources'
LOG_PATH = '/Users/msolomon/gnomadjs/logs'

def process_client_log(file_name, sort=False):
    log_file_path = os.path.join(LOG_PATH, file_name)

    headers = [
        'timestamp',
        'order',
        'gene_name',
        'exome_variants',
        'genome_variants',
        'exac_variants',
        'genome_coverage',
        'exome_coverage',
        'exacv1_coverage',
        'time'
    ]

    client_log = pd.read_csv(
        log_file_path,
        sep=',',
        names=headers,
        skiprows=1,
    )

    if sort:
        client_log = client_log.sort_values(by=['time'], ascending=False)

    return client_log



def process_database_log(file_name, sort=False):
    log_file_path = os.path.join(LOG_PATH, file_name)

    headers = [
        'data_type',
        'index',
        'gene_name',
        'retrieval_method',
        'retrieval_source',
        'base_pairs',
        'data_length',
        'time_ms'
    ]

    database_log = pd.read_csv(
        log_file_path,
        sep=',',
        names=headers,
        skiprows=10,
    )

    if sort:
        database_log = database_log.sort_values(by=['time_ms'], ascending=False)

    return database_log

def export_gene_list_to_json(dataframe, file_name):
    gene_list_file_path = os.path.join(RESOURCES_PATH, file_name)

    return dataframe.to_json(
        path_or_buf=gene_list_file_path,
        orient='values'
        )
