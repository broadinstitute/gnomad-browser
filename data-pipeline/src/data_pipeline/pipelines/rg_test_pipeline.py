import hail as hl

from pipeline import Pipeline, Task, run_pipeline

def test1(path, random_thing, create_test_datasets=False):
	print(f"\ntest1: running as subset? - {create_test_datasets}\n")
	test1ds = hl.import_table('/Users/rgrant/Downloads/test2/data.tsv', types={'Height': hl.tfloat64, 'Age': hl.tint32})
	return test1ds

def test2(path, random_thing):
	print(f"\ntest2: not possible to run as subset\n")
	test2ds = hl.import_table('/Users/rgrant/Downloads/test2/data.tsv', types={'Height': hl.tfloat64, 'Age': hl.tint32})
	return test2ds

pipeline = Pipeline()

pipeline.add_task(
	"test1",
	test1,
	"random/path/1",
	{"path": "random/path/2"},
	{"random_thing": "any_value"},
	subsettable=True,
)

pipeline.add_task(
	"test2",
	test2,
	"random/path/3",
	{"path": "random/path/4"},
	{"random_thing": "any_value"},
	# subsettable=True,
)

print("\nTask 1\n=====")
task1 = pipeline.get_task("test1")
print(f"Is subsettable?: {task1.is_subsettable()}")

print("\nTask 2\n=====")
task2 = pipeline.get_task("test2")
print(f"Is subsettable?: {task2.is_subsettable()}\n\n")

pipeline.set_outputs(
	{
		"test1_output": "test1",
		"test2_output": "test2",	
	}
)

run_pipeline(pipeline)

# RG - note to self
# ---
# Seems to be a success - can be run as a pipeline given the --create-test-datasets arg, and the only the
# tasks that are defined as being possible to subset will recieve the arg
# this way, you don't have to add the possible parameter to every single defined task 
# - just the ones that should be able to support small datasets.