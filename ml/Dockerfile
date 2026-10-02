FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY inference_api.py .
COPY gradcam.py .
COPY models/skin_densenet121_weighted.h5 models/skin_densenet121_weighted.h5

RUN mkdir -p generated

EXPOSE 8000

CMD ["uvicorn", "inference_api:app", "--host", "0.0.0.0", "--port", "8000"]
