FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start"]
