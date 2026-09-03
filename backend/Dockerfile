# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# npx/prisma use $HOME for their cache; point it at a writeable directory
# once we drop privileges below.
ENV HOME=/tmp

# Copy the full dependency tree (includes the Prisma CLI used for migrate
# deploy and the generated client with alpine-compatible engine binaries).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3001

# Run as the unprivileged "node" user shipped with the base image.
USER node

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]