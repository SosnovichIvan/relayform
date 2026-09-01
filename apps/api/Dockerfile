FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace @relayform/api

FROM dependencies AS runner
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 3001
ENV PORT=3001
CMD ["sh", "-c", "npm run migrate && npm run start"]
