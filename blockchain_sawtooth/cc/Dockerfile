FROM python:3.8-slim

RUN pip install sawtooth-sdk protobuf==3.20.3 ecdsa

WORKDIR /app
COPY seed.py .

CMD ["python3", "seed.py"]
