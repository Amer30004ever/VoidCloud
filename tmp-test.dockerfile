FROM node:20-alpine
WORKDIR /app
COPY services/auth/package.json .
RUN cat package.json | head -5
