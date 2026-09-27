FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV MEDIA_UPLOAD_DIR=/app/uploads
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV APP_VERSION=0.8.0
ENV BUILD_ID=20260927-47
LABEL version="0.8.0"
EXPOSE 3000

CMD ["npm", "start"]
