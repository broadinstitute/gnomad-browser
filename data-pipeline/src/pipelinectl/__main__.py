import argparse
import sys

from pipelinectl.subcommands import cluster
from pipelinectl.subcommands import config
from pipelinectl.subcommands import run


def main():
    parser = argparse.ArgumentParser(prog="pipelinectl")

    subcommands = {
        "config": config,
        "cluster": cluster,
        "run": run,
    }

    parser.add_argument("subcommand", choices=list(subcommands.keys()))

    args = parser.parse_args(sys.argv[1:2])

    subcommand = subcommands[args.subcommand]
    subcommand.main(sys.argv[2:])


if __name__ == "__main__":
    main()
