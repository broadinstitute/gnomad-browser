FROM --platform=linux/amd64 python:3.10-alpine

RUN mkdir /app
WORKDIR /app

ENV FLASK=app.py

COPY graphql-api/app.py /app/app.py
COPY graphql-api/requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt

CMD ["flask", "run"]
