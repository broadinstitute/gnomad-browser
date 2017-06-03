TEST_DIRECTORY := lens/graphql/tests
WATCH_DIRECTORY := lens

init:
	pip install -r requirements.txt

test:
	pytest tests

watch:
	watch "clear && pytest $(TEST_DIRECTORY) -v --capture=sys" $(WATCH_DIRECTORY) \
	--ignoreDotFiles
