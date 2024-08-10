FROM node:18-bullseye-slim

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

ADD . .
RUN corepack enable &&  \
    corepack prepare pnpm@latest --activate &&  \
    pnpm install &&  \
    pnpm build

CMD ["pnpm", "start"]
