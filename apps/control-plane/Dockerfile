FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src ./src
RUN mkdir -p /app/data && chown -R node:node /app

ENV STATE_FILE=/app/data/control-plane-state.json
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
