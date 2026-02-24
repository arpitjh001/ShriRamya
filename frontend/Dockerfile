FROM node:18 AS build

ARG REACT_APP_BACKEND_URL=http://localhost:8000

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
