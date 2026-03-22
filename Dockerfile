# syntax=docker/dockerfile:1

FROM node:lts-bookworm AS builder
WORKDIR /src

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:lts-bookworm
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /src/.next ./.next
COPY --from=builder /src/public ./public

EXPOSE 3000
CMD ["npm", "run", "start"]
