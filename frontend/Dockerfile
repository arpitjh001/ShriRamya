FROM node:20-alpine AS build

ARG REACT_APP_BACKEND_URL=http://localhost:8080

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
