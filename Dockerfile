# Angular build y Nginx para servir estático
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src
# Build de producción usando Angular CLI directamente
RUN npx --yes @angular/cli@20.1.0 build --configuration production

FROM nginx:1.25-alpine
# Configuración Nginx con fallback SPA
RUN printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n\n  location ~* \\.(?:css|js|map|png|jpg|jpeg|gif|ico|svg|eot|ttf|woff|woff2)$ {\n    expires 30d;\n    access_log off;\n    add_header Cache-Control "public, max-age=2592000, immutable";\n    try_files $uri =404;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
# Copiar salida de Angular
COPY --from=build /app/dist/gestionesApp /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
