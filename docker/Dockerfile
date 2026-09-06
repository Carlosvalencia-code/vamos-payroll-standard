FROM node:24-alpine

WORKDIR /app

# Copiar paquetes del monorepo y aplicación web
COPY package.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "--experimental-strip-types", "apps/web/src/server.ts"]
