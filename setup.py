# -*- coding: utf-8 -*-

from setuptools import setup, find_packages


with open('README.md') as f:
    readme = f.read()

with open('LICENSE') as f:
    license = f.read()

setup(
    name='py_utils',
    version='0.1.0',
    description='Python tools for variant portals',
    long_description=readme,
    author='Matthew Solomonson',
    author_email='msolomon@broadinstitute.org',
    url='http://gnomad.broadinstitute.org',
    license=license,
    packages=find_packages(exclude=('docs'))
)
