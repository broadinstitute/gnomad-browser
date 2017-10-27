#!/usr/bin/env python

import argparse as ap
import hail
from hail.representation import Interval

p = ap.ArgumentParser()
p.add_argument("--exomes-vds", help="Exomes dataset to be loaded, already split", required=True)
p.add_argument("--genomes-vds", help="Genomes dataset to be loaded, already split", required=True)
p.add_argument( "--exomes-vds-out", help="Exomes file to be written", required=True)
p.add_argument("--genomes-vds-out", help="Genomes file to be written", required=True)
p.add_argument("--interval", help="Interval to subset", required=True)
args = p.parse_args()

hc = hail.HailContext(log="/hail.log")

(hc.read(args.exomes_vds)
    .filter_intervals(Interval.parse(args.interval))
    .write(args.exomes_vds_out))

(hc.read(args.genomes_vds)
    .filter_intervals(Interval.parse(args.interval))
    .write(args.genomes_vds_out))
