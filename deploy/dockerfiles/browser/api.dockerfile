FROM --platform=linux/amd64 ubuntu
RUN apt update
RUN apt install -y python3-venv cargo

RUN mkdir /app
WORKDIR /app

RUN python3.12 -m venv ./.venv
ENV PATH=/app/.venv/bin:${PATH}

COPY graphql-api/requirements.txt /app/requirements.txt
RUN pip3 install -r requirements.txt

COPY graphql-api/app.py /app/app.py
COPY graphql-api/schema.graphql /app/schema.graphql
CMD ["python3", "app.py"]
