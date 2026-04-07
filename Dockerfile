FROM node:20-alpine AS base

# Dependencias críticas para descargar y fusionar multimedia
RUN apk add --no-cache libc6-compat ffmpeg python3
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true
RUN npm ci --ignore-scripts

# Copiamos código y construimos la imagen standalone de NextJS
COPY . .
# Evitamos alertas/telemetría en consola en producción
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Producción
FROM node:20-alpine AS runner
# El entorno de ejecución sigue requiriendo FFmpeg y Python para procesar
RUN apk add --no-cache ffmpeg python3 wget
RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Assets públicos y archivos aislados (standalone mode NextJS)
COPY --from=base /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Lanzar proceso local Node JS
CMD ["node", "server.js"]
