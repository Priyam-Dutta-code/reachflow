# ReachFlow V2 web — Phase 0 stub image (arm64 + amd64).
# Phase 5 replaces this with the Next.js standalone build.
FROM node:22-alpine

WORKDIR /app

COPY server.mjs .

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.mjs"]
