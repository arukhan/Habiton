FROM golang:1.25-alpine AS build
WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -o /habiton-api .
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /habiton-api /app/api
EXPOSE 8080
CMD ["/app/api"]
