# Dockerfile for Django backend
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY . /app/
RUN python manage.py makemigrations
RUN python manage.py migrate
CMD ["gunicorn", "backend_django.wsgi:application", "--bind", "0.0.0.0:8000"]