FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# What this image is, baked in rather than passed at run time: a rollback re-runs an
# older image, and it must keep reporting the build it is. Shown on /settings.
ARG APP_BUILD=dev
ARG RELEASE_DATE=""
ENV APP_BUILD=$APP_BUILD RELEASE_DATE=$RELEASE_DATE
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# Read by instrumentation.ts on start-up; the standalone output leaves them out.
COPY --from=build --chown=nextjs:nodejs /app/db/migrations ./db/migrations
COPY --from=build --chown=nextjs:nodejs /app/content ./content
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
