FROM node:22-alpine AS builder

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/pharmacy-pos/ ./artifacts/pharmacy-pos/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

ARG PORT=5173
ARG BASE_PATH=/
ENV PORT=$PORT
ENV BASE_PATH=$BASE_PATH

RUN pnpm --filter @workspace/pharmacy-pos run build

FROM nginx:alpine
COPY --from=builder /workspace/artifacts/pharmacy-pos/dist/public /usr/share/nginx/html
COPY artifacts/pharmacy-pos/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
