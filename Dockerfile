FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_VERSION=0.5.3
ENV BUILD_ID=20260925-31
LABEL version="0.5.3"
EXPOSE 3000

CMD ["npm", "start"]
