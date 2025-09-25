"""Download ClinGen Canonical Allele IDs for variants in the specified VCF."""

import argparse
import asyncio
import errno
import gzip
import json
import logging
import socket
from concurrent.futures import ThreadPoolExecutor
from typing import Awaitable, Callable, TypeVar

import aiohttp
from hailtop.aiotools.router_fs import RouterAsyncFS
from hailtop.utils import bounded_gather, sleep_before_try
from hailtop.utils.rich_progress_bar import SimpleCopyToolProgressBar
from rich.console import Console

console = Console()

logger = logging.getLogger("get_caids")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)


def filter_vcf_header(header: str) -> str:
    """Filter a VCF header to include only the format line and contigs 1-22, X, Y, and M."""
    assembly = "GRCh37" if "assembly=GRCh37" in header else "GRCh38"

    contigs_to_keep = set(
        [str(i) for i in range(1, 23)] + ["X", "Y", "MT"]
        if assembly == "GRCh37"
        else [f"chr{i}" for i in range(1, 23)] + ["chrX", "chrY", "chrM"]
    )

    def should_include_line(line):
        if line.startswith("##"):
            if line.startswith("##fileformat"):
                return True

            if line.startswith("##contig"):
                contig, *_ = line[13:-1].split(",")
                return contig in contigs_to_keep

            return False

        return True

    output_lines = [line for line in header.splitlines() if should_include_line(line)]
    return "\n".join(output_lines)


RETRYABLE_HTTP_STATUS_CODES = {408, 500, 502, 503, 504}


def is_transient_error(e):
    if isinstance(e, aiohttp.ClientResponseError) and (e.status in RETRYABLE_HTTP_STATUS_CODES):
        return True
    if isinstance(e, aiohttp.ServerTimeoutError):
        return True
    if isinstance(e, aiohttp.ServerDisconnectedError):
        return True
    if isinstance(e, aiohttp.client_exceptions.ClientConnectorError):
        return hasattr(e, "os_error") and is_transient_error(e.os_error)
    if isinstance(e, OSError) and e.errno in (
        errno.ETIMEDOUT,
        errno.ECONNREFUSED,
        errno.EHOSTUNREACH,
        errno.ECONNRESET,
        errno.ENETUNREACH,
        errno.EPIPE,
    ):
        return True
    if isinstance(e, aiohttp.ClientOSError):
        return is_transient_error(e.__cause__)
    if isinstance(e, socket.timeout):
        return True
    if isinstance(e, socket.gaierror):
        return e.errno == socket.EAI_AGAIN
    if isinstance(e, ConnectionResetError):
        return True
    return False


T = TypeVar("T")


async def retry_transient_errors(f: Callable[..., Awaitable[T]], max_attempts: int = 3) -> T:
    tries = 0
    while True:
        try:
            return await f()
        except Exception as e:
            if not is_transient_error(e):
                raise
            tries += 1
            if tries >= max_attempts:
                raise

        await sleep_before_try(tries)


async def get_caids(sharded_vcf_url: str, output_url: str, *, parallelism: int = 4, request_timeout: int = 10,) -> None:
    """
    Download ClinGen Canonical Allele IDs for variants in the specified VCF.

    TSV files containing CAIDs will be written to the directory/prefix specified by `output_url`.
    One file will be written per partition in the sharded VCF.

    :param sharded_vcf_url: URL to a VCF exported with `hl.export_vcf(table, path, parallel='separate_header')`.
    :param output_url: URL to a directory/prefix where output files will be written.
    :param parallelism: Parallelism to use for processing parts.
    :param request_timeout: Timeout (in minutes) for requests to ClinGen Allele Registry.
    """
    # Remove trailing slashes to avoid issues constructing URLs.
    sharded_vcf_url = sharded_vcf_url.rstrip("/")
    output_url = output_url.rstrip("/")

    with ThreadPoolExecutor() as thread_pool:
        local_kwargs = {'thread_pool': thread_pool}
        async with RouterAsyncFS(
            local_kwargs=local_kwargs
        ) as fs, aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=request_timeout * 60)) as session:
            # The ClinGen Allele Registry API does not accept VCFs with contigs other than 1-22, X, Y, and M.
            # Remove other contigs from the VCF header.
            header_url = f"{sharded_vcf_url}/header"
            if sharded_vcf_url.endswith(".gz"):
                header_url += ".gz"
            header_stream = await fs.open(header_url)
            header_data = await header_stream.read()
            if header_url.endswith(".gz"):
                header_data = gzip.decompress(header_data)
            header = header_data.decode("utf-8")
            header = filter_vcf_header(header)

            assembly = "GRCh37" if "assembly=GRCh37" in header else "GRCh38"

            # Get list of VCF partitions.
            all_part_urls = [
                await f.url() async for f in await fs.listfiles(sharded_vcf_url) if f.basename().startswith("part-")
            ]

            # Get list of parts in output.
            try:
                completed_part_urls = [
                    await f.url() async for f in await fs.listfiles(output_url) if f.basename().startswith("part-")
                ]
            except FileNotFoundError:
                completed_part_urls = []

            completed_parts = set([part_url.split("/")[-1].split(".")[0] for part_url in completed_part_urls])

            # Identify parts that are not present in output.
            # This allows resuming after an error occurs without losing/repeating partitions.
            remaining_part_urls = []
            for part_url in all_part_urls:
                part_name = part_url.split("/")[-1].split(".")[0]
                if part_name not in completed_parts:
                    remaining_part_urls.append(part_url)

            logger.warning(f'\n\nParts Counts\nTotal: {len(all_part_urls)}\nCompleted: {len(completed_parts)}\nRemaining: {len(remaining_part_urls)}\n')

            with SimpleCopyToolProgressBar(total=len(remaining_part_urls)) as progress:

                def create_task(part_url):
                    async def task():
                        # Read VCF partition and prepend header.
                        part_stream = await fs.open(part_url)
                        part_data = await part_stream.read()
                        if part_url.endswith(".gz"):
                            part_data = gzip.decompress(part_data)
                        part_data = part_data.decode("utf-8")
                        part_vcf = header + "\n" + part_data

                        # Send request to ClinGen Allele Registry.
                        try:
                            response = await retry_transient_errors(
                                lambda: session.post(
                                    "https://reg.clinicalgenome.org/annotateVcf",
                                    params={"assembly": assembly, "ids": "CA"},
                                    data=part_vcf,
                                )
                            )
                        except asyncio.TimeoutError:
                            logger.error("Request for %s timed out", part_url)
                        except Exception:
                            logger.exception("Failed to fetch CAIDS for %s", part_url)
                        else:
                            annotated_part_vcf = await response.text()

                            # Convert response from VCF to a TSV with locus, alleles, CAID columns.
                            part_name = part_url.split("/")[-1].split(".")[0]
                            async with await fs.create(f"{output_url}/{part_name}.tsv") as output_stream:
                                header_line = "\t".join(["locus", "alleles", "CAID"]) + "\n"
                                await output_stream.write(header_line.encode("utf-8"))

                                for line in annotated_part_vcf.splitlines():
                                    if line.startswith("#"):
                                        continue

                                    [contig, pos, caid, ref, alt, *_] = line.split("\t")
                                    locus = f"{contig}:{pos}"
                                    alleles = [ref, alt]

                                    output_line = "\t".join([locus, json.dumps(alleles), caid]) + "\n"
                                    await output_stream.write(output_line.encode("utf-8"))
                        finally:
                            # Update progress bar.
                            progress.update(1)

                    return task

                # Process partitions in parallel.
                tasks = [create_task(part_url) for part_url in remaining_part_urls]
                await bounded_gather(*tasks, parallelism=parallelism)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("vcf_url")
    parser.add_argument("output_url")
    parser.add_argument("--parallelism", type=int, default=4)
    parser.add_argument("--request-timeout", type=int, default=10)
    args = parser.parse_args()

    return asyncio.get_event_loop().run_until_complete(
        get_caids(args.vcf_url, args.output_url, parallelism=args.parallelism, request_timeout=args.request_timeout,)
    )


if __name__ == "__main__":
    main()
