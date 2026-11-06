FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir paho-mqtt requests numpy

COPY data/simulator.py /app/simulator.py

CMD ["python", "simulator.py"]
