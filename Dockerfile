# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package.json + patch script before install
COPY frontend/package.json ./
COPY frontend/scripts ./scripts

# Install with legacy peer deps; postinstall patches ajv-keywords@3.x for ajv@8 compat
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY frontend/ ./

# Build args baked into the React bundle at build time
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL
ARG REACT_APP_GOOGLE_CLIENT_ID

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV CI=false
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ── Stage 2: Express backend + React build ────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install production deps only
COPY backend/package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy backend source
COPY backend/ ./

# Copy React build into backend/public (Express serves it as static files)
COPY --from=frontend-build /app/frontend/build ./public

# Azure App Service sets PORT automatically; fallback to 5001 for local Docker
EXPOSE 5001

CMD ["node", "server.js"]
