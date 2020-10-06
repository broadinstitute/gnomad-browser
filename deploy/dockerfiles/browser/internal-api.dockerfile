FROM ubuntu:18.04

RUN apt-get -qq update && \
  # JDK
  apt-get -qq install openjdk-8-jdk-headless && \
  # Python 3.7
  apt-get -qq install python3.7 python3-pip && \
  update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.7 1 && \
  python3 -m pip install --no-cache-dir --upgrade pip && \
  # Clean up apt-cache
  rm -rf /var/lib/apt/lists/* && \
  # Create hail user
  useradd --create-home hail && \
  # Create workdir
  mkdir -p /home/hail/workspace && \
  chown -R hail:hail /home/hail/workspace

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER hail
WORKDIR /app

ENV PATH="/home/hail/.local/bin:$PATH"

COPY internal-api/requirements.txt .
RUN python3 -m pip install --user --no-cache-dir -r requirements.txt

COPY internal-api/src/gnomad_api ./gnomad_api

CMD ["gunicorn", \
  "--bind", ":8000", \
  "--access-logfile", "-", \
  "--error-logfile", "-", \
  "--timeout", "60", \
  "--workers", "2", "--worker-class", "aiohttp.GunicornWebWorker", \
  "--worker-tmp-dir", "/dev/shm", \
  "gnomad_api.app:init_app"]
