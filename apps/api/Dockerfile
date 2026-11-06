# Imagen para Cloud Run. Se construye desde apps/api:  docker build -t oficio-api .
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
# Cloud Run inyecta PORT; las demás variables se configuran como secretos del servicio
CMD ["node", "dist/index.js"]
