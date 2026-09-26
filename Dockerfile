FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV APP_VERSION=0.6.2
ENV BUILD_ID=20260925-40
LABEL version="0.6.2"
EXPOSE 3000

CMD ["npm", "start"]
