FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
WORKDIR /app
# pnpm only runs build scripts listed in pnpm-workspace.yaml's allowBuilds
# (esbuild), so playwright's ~300MB browser download never happens here. The
# browsers are only used by the Storybook test runner anyway.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV HUSKY=0
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN pnpm install --frozen-lockfile --filter finsight-frontend...
COPY frontend frontend
RUN pnpm --filter finsight-frontend build

FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
