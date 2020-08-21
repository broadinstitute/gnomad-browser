import argparse
import datetime
import logging
import os
import shutil
import subprocess
import tempfile
import time
from collections import OrderedDict

import hail as hl


logger = logging.getLogger("data_pipeline")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)


class GoogleCloudStorageFileSystem:
    def exists(self, path):  # pylint: disable=no-self-use
        return hl.hadoop_exists(path)

    def modified_time(self, path):  # pylint: disable=no-self-use
        stat = hl.hadoop_stat(path)
        return datetime.datetime.strptime(stat["modification_time"], "%a %b %d %H:%M:%S %Z %Y")


class LocalFileSystem:
    def exists(self, path):  # pylint: disable=no-self-use
        return os.path.isfile(path)

    def modified_time(self, path):  # pylint: disable=no-self-use
        stat_result = os.stat(path)
        return datetime.datetime.fromtimestamp(stat_result.st_mtime)


def file_exists(path):
    file_system = GoogleCloudStorageFileSystem() if path.startswith("gs://") else LocalFileSystem()
    check_path = path + "/_SUCCESS" if path.endswith(".ht") else path
    return file_system.exists(check_path)


def modified_time(path):
    file_system = GoogleCloudStorageFileSystem() if path.startswith("gs://") else LocalFileSystem()
    check_path = path + "/_SUCCESS" if path.endswith(".ht") else path
    return file_system.modified_time(check_path)


class Task:
    def __init__(self, name, work, output_path, inputs=None, params=None):
        self.name = name
        self.work = work
        self.output_path = output_path
        self.inputs = inputs or {}
        self.params = params or {}

    def should_run(self):
        if not file_exists(self.output_path):
            return (True, "Output does not exist")

        if self.inputs:
            output_mod_time = modified_time(self.output_path)
            input_mod_time = max(modified_time(path) for path in self.inputs.values())

            if input_mod_time > output_mod_time:
                return (True, "Input is newer than output")

        return (False, None)

    def run(self, force=False):
        should_run, reason = (True, "Forced") if force else self.should_run()
        if should_run:
            logger.info("Running %s (%s)", self.name, reason)
            start = time.perf_counter()
            result = self.work(**self.inputs, **self.params)
            result.write(self.output_path, overwrite=True)  # pylint: disable=unexpected-keyword-arg
            stop = time.perf_counter()
            elapsed = stop - start
            logger.info("Finished %s in %dm%02ds", self.name, elapsed // 60, elapsed % 60)
        else:
            logger.info("Skipping %s", self.name)


class DownloadTask:
    def __init__(self, name, url, output_path):
        self.name = name
        self.url = url
        self.output_path = output_path

    def should_run(self):
        if not file_exists(self.output_path):
            return (True, "Output does not exist")

        return (False, None)

    def run(self, force=False):
        should_run, reason = (True, "Forced") if force else self.should_run()
        if should_run:
            logger.info("Running %s (%s)", self.name, reason)

            start = time.perf_counter()
            with tempfile.NamedTemporaryFile() as tmp:
                subprocess.check_call(["curl", "-o", tmp.name, self.url])

                if self.output_path.startswith("gs://"):
                    subprocess.check_call(["gsutil", "cp", tmp.name, self.output_path])
                else:
                    shutil.copyfile(tmp.name, self.output_path)

            stop = time.perf_counter()
            elapsed = stop - start
            logger.info("Finished %s in %dm%02ds", self.name, elapsed // 60, elapsed % 60)
        else:
            logger.info("Skipping %s", self.name)


class Pipeline:
    def __init__(self):
        self._tasks = OrderedDict()

    def add_task(self, name, *args, **kwargs):
        task = Task(name, *args, **kwargs)
        self._tasks[name] = task
        return task

    def add_download_task(self, name, *args, **kwargs):
        task = DownloadTask(name, *args, **kwargs)
        self._tasks[name] = task
        return task

    def get_task(self, name):
        try:
            return self._tasks[name]
        except KeyError:
            raise ValueError(f"Pipeline contains no task named '{name}'")

    def get_all_tasks(self):
        return list(self._tasks.keys())

    def run(self, force_tasks=None):
        for task_name, task in self._tasks.items():
            task.run(force=force_tasks and task_name in force_tasks)


def parse_pipeline_args(pipeline):
    tasks = pipeline.get_all_tasks()

    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--force", choices=tasks, nargs="+")
    group.add_argument("--force-all", action="store_true")
    args = parser.parse_args()

    pipeline_args = {}
    if args.force_all:
        pipeline_args["force_tasks"] = tasks
    elif args.force:
        pipeline_args["force_tasks"] = args.force

    return pipeline_args
