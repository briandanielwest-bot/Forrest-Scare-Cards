# Multi-stage build: compile TypeScript, then run the compiled JS with only
# production dependencies installed. Works on Fly.io, Railway, Google Cloud
# Run, or any host that can run a container.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Set ANTHROPIC_API_KEY (required) and any of ANTHROPIC_MODEL / CORS_ORIGIN /
# PORT (optional — see .env.example) via your host's environment variables,
# not by baking them into the image.
EXPOSE 4000
CMD ["node", "dist/index.js"]
