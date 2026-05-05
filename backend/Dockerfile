FROM node:20-alpine AS base
WORKDIR /app

# Install build deps for native modules (sharp, tesseract)
RUN apk add --no-cache python3 make g++ libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Tesseract language data
ENV TESSDATA_PREFIX=/app/tessdata
RUN mkdir -p /app/tessdata

EXPOSE 4000
CMD ["node", "src/server.js"]
