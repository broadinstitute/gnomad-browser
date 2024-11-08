import argparse
import datetime
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Callable, Dict, List, Optional, Union
import attr
from collections import OrderedDict

from loguru import logger

import hail as hl

from data_pipeline.config import PipelineConfig


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


@attr.define
class DownloadTask:
    _config: Optional[PipelineConfig]
    _name: str
    _url: str
    _output_path: str

    @classmethod
    def create(cls, config: Optional[PipelineConfig], name: str, url: str, output_path: str):
        return cls(config, name, url, output_path)

    def get_output_path(self):
        if self._config:
            return self._config.output_root + self._output_path
        else:
            return _pipeline_config["output_root"] + self._output_path

    def should_run(self):
        output_path = self.get_output_path()
        if not file_exists(output_path):
            return (True, "Output does not exist")

        return (False, None)

    def get_inputs(self):
        raise NotImplementedError("Method not valid for DownloadTask")

    def run(self, force=False):
        output_path = self.get_output_path()
        should_run, reason = (True, "Forced") if force else self.should_run()
        if should_run:
            logger.info(f"Running {self._name} ({reason}")

            start = time.perf_counter()
            with tempfile.NamedTemporaryFile() as tmp:
                subprocess.check_call(["curl", "-o", tmp.name, self._url])

                if output_path.startswith("gs://"):
                    subprocess.check_call(["gsutil", "cp", tmp.name, output_path])
                else:
                    shutil.copyfile(tmp.name, output_path)

            stop = time.perf_counter()
            elapsed = stop - start
            logger.info(f"Finished {self._name} in {int(elapsed // 60)}m{elapsed % 60:.2f}s")
        else:
            logger.info(f"Skipping {self._name}")


@attr.define
class Task:
    _name: str
    _task_function: Callable
    _output_path: str
    _inputs: dict
    _params: dict
    _config: Optional[PipelineConfig] = None

    @classmethod
    def create(
        cls,
        config: Optional[PipelineConfig],
        name: str,
        task_function: Callable,
        output_path: str,
        inputs: Optional[dict] = None,
        params: Optional[dict] = None,
    ):
        if inputs is None:
            inputs = {}
        if params is None:
            params = {}
        return cls(name, task_function, output_path, inputs, params, config)

    def get_output_path(self):
        if self._config:
            return os.path.join(self._config.output_root, self._output_path)
        else:
            return _pipeline_config["output_root"] + self._output_path

    def get_inputs(self):
        paths = {}

        for k, v in self._inputs.items():
            if isinstance(v, (Task, DownloadTask)):
                paths.update({k: v.get_output_path()})
            else:
                if self._config:
                    if self._config.input_root:
                        paths.update({k: os.path.join(self._config.input_root, v)})
                        if "gs://" in v:
                            paths.update({k: v})
                    else:
                        paths.update({k: v})
                else:
                    paths.update({k: v})

        return paths

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

    def run(self, force=False):
        output_path = self.get_output_path()
        should_run, reason = (True, "Forced") if force else self.should_run()
        if should_run:
            logger.info(f"Running {self._name} ({reason})")
            start = time.perf_counter()
            result = self._task_function(**self.get_inputs(), **self._params)

            if self._config:
                if "gs://" not in self._config.output_root:
                    Path(self._config.output_root).mkdir(parents=True, exist_ok=True)

            result.write(output_path, overwrite=True)  # pylint: disable=unexpected-keyword-arg
            stop = time.perf_counter()
            elapsed = stop - start
            logger.info(f"Finished {self._name} in {int(elapsed // 60)}m{elapsed % 60:.2f}s")
        else:
            logger.info(f"Skipping {self._name}")


@attr.define
class Pipeline:
    config: Optional[PipelineConfig] = None
    _tasks: OrderedDict = OrderedDict()
    _outputs: dict = {}

    def add_task(
        self,
        name: str,
        task_function: Callable,
        output_path: str,
        inputs: Optional[dict] = None,
        params: Optional[dict] = None,
    ):
        if inputs is None:
            inputs = {}
        if params is None:
            params = {}
        task = Task.create(self.config, name, task_function, output_path, inputs, params)
        self._tasks[name] = task
        return task

    def add_download_task(self, name, *args, **kwargs) -> DownloadTask:
        task = DownloadTask.create(self.config, name, *args, **kwargs)
        self._tasks[name] = task
        return task

    def get_task(self, name: str) -> Union[Task, DownloadTask]:
        try:
            return self._tasks[name]
        except KeyError as error:
            raise ValueError(f"Pipeline contains no task named '{name}'") from error

    def get_all_task_names(self) -> List[str]:
        return list(self._tasks.keys())

    def run(self, force_tasks=None) -> None:
        for task_name, task in self._tasks.items():
            task.run(force=force_tasks and task_name in force_tasks)

    def set_outputs(self, outputs) -> None:
        for output_name, task_name in outputs.items():
            assert task_name in self._tasks, f"Unable to set output '{output_name}', no task named '{task_name}'"

        self._outputs = outputs

    def get_output(self, output_name) -> Union[Task, DownloadTask]:
        task_name = self._outputs[output_name]
        return self._tasks[task_name]


@attr.define
class PipelineMock:
    output_mappings: Dict[str, str]

    @classmethod
    def create(cls, output_mappings: Dict[str, str]):
        return cls(output_mappings)

    def get_output(self, output_name):
        if output_name in self.output_mappings:
            return self.output_mappings.get(output_name)
        raise ValueError("Output name is not valid")


def run_pipeline(pipeline: Pipeline):
    task_names = pipeline.get_all_task_names()

    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--force", choices=task_names, nargs="+")
    group.add_argument("--force-all", action="store_true")
    args = parser.parse_args()

    if args.output_root:
        _pipeline_config["output_root"] = args.output_root.rstrip("/")

    pipeline_args = {}
    if args.force_all:
        pipeline_args["force_tasks"] = task_names
    elif args.force:
        pipeline_args["force_tasks"] = args.force

    hl.init()

    pipeline.run(**pipeline_args)
