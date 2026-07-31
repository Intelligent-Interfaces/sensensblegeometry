FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML copilot code
COPY . .

# Future: Expose ML API port, e.g., FastAPI on 8000
EXPOSE 8000

# Keep alive or run the service
CMD ["python", "-u", "-m", "http.server", "8000"]
