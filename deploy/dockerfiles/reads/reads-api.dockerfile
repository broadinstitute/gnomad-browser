FROM --platform=linux/amd64 node:18.17-alpine
RUN npm install -g pnpm@^8.14.3

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node reads/package.json .
RUN pnpm install --production

# Copy source
COPY --chown=node:node reads/src /app/src

# Run
CMD ["node", "src/server.js"]
