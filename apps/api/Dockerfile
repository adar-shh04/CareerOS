FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

COPY . .

RUN corepack pnpm install --frozen-lockfile

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN corepack pnpm --filter careeros-api build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app /app

EXPOSE 3000

CMD ["corepack","pnpm","--filter","careeros-api","start:prod"]