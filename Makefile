.PHONY: install run seed test clean

install:
	python -m pip install -r requirements.txt

run:
	uvicorn app.main:app --reload

seed:
	python -m scripts.seed

test:
	pytest

clean:
	rm -f maintainflow.db
