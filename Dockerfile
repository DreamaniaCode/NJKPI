FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV APP_VERSION=0.5.5
ENV BUILD_ID=20260925-33
LABEL version="0.5.5"
EXPOSE 3000

CMD ["npm", "start"]
