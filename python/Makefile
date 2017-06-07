GRAPHQL_TEST_DIRECTORY := portage/graphql/tests
HAILUTILS_TEST_DIRECTORY := portage/hail/tests

WATCH_DIRECTORY := portage

init:
	pip install -r requirements.txt

clean:
	find . | grep -E "(__pycache__|\.pyc|\.pyo$)" | xargs rm -rf

test:
	pytest tests

graph:
	watch "clear && pytest $(GRAPHQL_TEST_DIRECTORY) -v --capture=sys" $(WATCH_DIRECTORY) \
	--ignoreDotFiles

hail:
	watch "clear && pytest $(HAILUTILS_TEST_DIRECTORY) -v --capture=sys" $(WATCH_DIRECTORY) \
	--ignoreDirectoryPattern=/__pycache__/ \
	--ignoreDotFiles
