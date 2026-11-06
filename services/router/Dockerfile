FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/router/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/router /app/services/router

ENV PYTHONPATH=/app/services/router

EXPOSE 8001

CMD ["uvicorn", "engine:app", "--host", "0.0.0.0", "--port", "8001"]
