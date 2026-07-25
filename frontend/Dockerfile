FROM node:24-slim AS build
WORKDIR /app
# The playwright package (a devDependency, pulled in by npm ci) downloads ~300MB
# of browsers on install; they are only used by the Storybook test runner.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
