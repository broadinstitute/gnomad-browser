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


logger = logging.getLogger("gnomad_data_pipeline")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)


class GoogleCloudStorageFileSystem:
    def exists(self, path):  # pylint: disable=no-self-use
        return hl.hadoop_exists(path)

    def modified_time(self, path):  # pylint: disable=no-self-use
        # The Hail docs say that stat["modification_time"] should be a string,
        # but in the case of Google Cloud Storage, it returns an epoch timestamp
        # as an int. There is a Google Cloud Storage filesystem in the Hail
        # backend, but no Python bindings for it as of yet; when those bindings
        # exist, we should probably use that filesystem here instead of a
        # generic Hadoop FS.
        stat = hl.hadoop_stat(path)
        return stat["modification_time"]


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


_pipeline_config = {}


class DownloadTask:
    def __init__(self, name, url, output_path):
        self._name = name
        self._url = url
        self._output_path = output_path

    def get_output_path(self):
        return _pipeline_config["output_root"] + self._output_path

    def should_run(self):
        output_path = self.get_output_path()
        if not file_exists(output_path):
            return (True, "Output does not exist")

        return (False, None)

    def run(self, force=False, create_test_datasets=False):
        output_path = self.get_output_path()
        should_run, reason = (True, "Forced") if force else self.should_run()
        if should_run:
            logger.info("Running %s (%s)", self._name, reason)

            start = time.perf_counter()
            with tempfile.NamedTemporaryFile() as tmp:
                subprocess.check_call(["curl", "-o", tmp.name, self._url])

                if output_path.startswith("gs://"):
                    subprocess.check_call(["gsutil", "cp", tmp.name, output_path])
                else:
                    shutil.copyfile(tmp.name, output_path)

            stop = time.perf_counter()
            elapsed = stop - start
            logger.info("Finished %s in %dm%02ds", self._name, elapsed // 60, elapsed % 60)
        else:
            logger.info("Skipping %s", self._name)


class Task:
    def __init__(self, name, work, output_path, inputs=None, params=None, subsettable=False):
        self._name = name
        self._work = work
        self._output_path = output_path
        self._inputs = inputs or {}
        self._params = params or {}
        self._subsettable = subsettable

    def get_output_path(self):
        return _pipeline_config["output_root"] + self._output_path

    def get_inputs(self):
        return {k: v.get_output_path() if isinstance(v, (Task, DownloadTask)) else v for k, v in self._inputs.items()}

    def should_run(self):
        output_path = self.get_output_path()
        if not file_exists(output_path):
            return (True, "Output does not exist")

        if self._inputs:
            output_mod_time = modified_time(output_path)
            input_mod_time = max(modified_time(path) for path in self.get_inputs().values())

            if input_mod_time > output_mod_time:
                return (True, "Input is newer than output")

        return (False, None)

    # TODO:FIXME: (rgrant)
    #   basically a getter that can be used to check when running a pipeline if you should add the args
    def is_subsettable(self):
        return self._subsettable

    def run(self, force=False, create_test_datasets=False):
        output_path = self.get_output_path()
        should_run, reason = (True, "Forced") if force else self.should_run()
        if should_run:
            logger.info("Running %s (%s)", self._name, reason)
            start = time.perf_counter()
            # TODO: (rgrant) - is this where I do it:
            #   actually, I don't even need the if - this is legit a if true, pass true, if false, pass false
            #   so i can just hand off the value onto the `_work` method?
            #   and the `_work` is actually a given pipeline

            if self.is_subsettable():
                print("I am subsettable!")
                # only pass this additional positional argument if the task itself supports subsetting
                #   if test_datasets is false, still pass it - it doesn't matter
                result = self._work(**self.get_inputs(), **self._params, create_test_datasets=create_test_datasets)
            else:
                result = self._work(**self.get_inputs(), **self._params)

            result.write(output_path, overwrite=True)  # pylint: disable=unexpected-keyword-arg
            stop = time.perf_counter()
            elapsed = stop - start
            logger.info("Finished %s in %dm%02ds", self._name, elapsed // 60, elapsed % 60)
        else:
            logger.info("Skipping %s", self._name)


class Pipeline:
    def __init__(self):
        self._tasks = OrderedDict()
        self._outputs = {}

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
        except KeyError as error:
            raise ValueError(f"Pipeline contains no task named '{name}'") from error

    def get_all_tasks(self):
        return list(self._tasks.keys())

    # TODO:FIXME: (rgrant) - here I should be able to add a new named arg
    def run(self, force_tasks=None, create_test_datasets=False):
        if create_test_datasets:
            print("\n=== Running in Test Dataset mode\n")
        for task_name, task in self._tasks.items():
            # TODO:FIXME: (rgrant) here I just handed off create_test_datasets to task.run (line 126)
            # TODO:FIXME: (rgrant) I should add a check for if this task is 'subsettable'
            # if task.canBeSubsetted():
            task.run(force=force_tasks and task_name in force_tasks, create_test_datasets=create_test_datasets)
            # else:
            # task.run(force=force_tasks and task_name in force_tasks)

    # TODO:FIXME: (rgrant) - OLD UNTOUCHED ONE
    # def run(self, force_tasks=None):
    #     for task_name, task in self._tasks.items():
    #         task.run(force=force_tasks and task_name in force_tasks)

    def set_outputs(self, outputs):
        for output_name, task_name in outputs.items():
            assert task_name in self._tasks, f"Unable to set output '{output_name}', no task named '{task_name}'"

        self._outputs = outputs

    def get_output(self, output_name):
        task_name = self._outputs[output_name]
        return self._tasks[task_name]


def run_pipeline(pipeline):
    tasks = pipeline.get_all_tasks()

    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", required=True)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--force", choices=tasks, nargs="+")
    group.add_argument("--force-all", action="store_true")
    # TODO:FIXME: (rgrant) - adding the argument to be parsed here
    parser.add_argument("--create-test-datasets", action="store_true")
    args = parser.parse_args()

    _pipeline_config["output_root"] = args.output_root.rstrip("/")

    pipeline_args = {}
    if args.force_all:
        pipeline_args["force_tasks"] = tasks
    elif args.force:
        pipeline_args["force_tasks"] = args.force

    # TODO: (rgrant) added to add the argument
    #   possibly antipattern (if true, return true) - but I'm not sure of the alternative
    if args.create_test_datasets:
        pipeline_args["create_test_datasets"] = args.create_test_datasets

    hl.init()

    pipeline.run(**pipeline_args)
