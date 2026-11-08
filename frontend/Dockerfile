FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
ENV BACKEND_URL=http://backend:8080
RUN npm run build
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
