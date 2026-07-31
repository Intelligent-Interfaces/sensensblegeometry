# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o sensensblegeometry-backend

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/sensensblegeometry-backend .

# Port for the Go server
EXPOSE 8080

CMD ["./sensensblegeometry-backend"]
