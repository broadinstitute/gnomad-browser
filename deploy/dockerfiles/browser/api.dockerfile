FROM --platform=linux/amd64 ubuntu
#FROM --platform=linux/amd64 python:3.10-alpine
#RUN apk add cargo
#RUN apk add rust
RUN apt update
RUN apt install -y python3.12-venv cargo

RUN mkdir /app
WORKDIR /app
RUN python3.12 -m venv ./.venv
RUN /bin/bash .venv/bin/activate
COPY graphql-api/requirements.txt /app/requirements.txt
RUN ./.venv/bin/pip3 install -r requirements.txt

ENV FLASK=app.py

COPY graphql-api/app.py /app/app.py
CMD ["flask", "run"]
