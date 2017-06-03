GRAPHQL_TEST_DIRECTORY := lens/graphql/tests
HAILUTILS_TEST_DIRECTORY := lens/hail/tests

WATCH_DIRECTORY := lens

init:
	pip install -r requirements.txt

test:
	pytest tests

graph:
	watch "clear && pytest $(GRAPHQL_TEST_DIRECTORY) -v --capture=sys" $(WATCH_DIRECTORY) \
	--ignoreDotFiles

hail:
	watch "clear && pytest $(HAILUTILS_TEST_DIRECTORY) -v --capture=sys" $(WATCH_DIRECTORY) \
	--ignoreDotFiles
