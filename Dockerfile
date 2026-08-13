FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# db push + seed are idempotent (seed skips if foods exist), so boot is safe on every deploy.
# Mount a volume and set DATABASE_URL=file:/data/calazm.db for persistence.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npm start"]
