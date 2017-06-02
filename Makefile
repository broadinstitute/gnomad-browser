FILENAME := lens

init:
	pip install -r requirements.txt

test:
	pytest tests

watch:
	watch "clear && pytest -v --capture=sys" $(FILENAME) --ignoreDotFiles
