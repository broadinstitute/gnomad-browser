import hail as hl

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.clinvar import (
    CLINVAR_XML_URL,
    import_clinvar_xml,
)

pipeline = Pipeline()

pipeline.add_download_task(
    "download_clinvar_xml",
    CLINVAR_XML_URL,
    "/external_sources/clinvar.xml.gz",
)

pipeline.add_task(
    "import_clinvar_xml",
    import_clinvar_xml,
    "/clinvar/clinvar.ht",
    {"clinvar_xml_path": pipeline.get_task("download_clinvar_xml")},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"clinvar_variants": "import_clinvar_xml"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)
