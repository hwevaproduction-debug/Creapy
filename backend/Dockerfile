FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# Ensure Prisma client is generated for runtime
RUN npx prisma generate || true
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node","server.js"]
