FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_VERSION=0.4.0
LABEL version="0.4.0"
EXPOSE 3000

CMD ["npm", "start"]
