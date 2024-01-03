FROM python:3.12-alpine

# Create app user and group
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
COPY deploy/dockerfiles/blog/auth-requirements.txt .
RUN pip install --no-cache-dir -r auth-requirements.txt

# Copy code
COPY deploy/dockerfiles/blog/auth.py .

# Run as app user
RUN chown -R app:app .
USER app

# Run
CMD ["gunicorn", \
  "--bind", ":8000", \
  "--log-file", "-", \
  "--workers", "2", "--threads", "4", "--worker-class", "gthread", \
  "--worker-tmp-dir", "/dev/shm", \
  "auth:app"]
