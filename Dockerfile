FROM node:16.18 as build 
WORKDIR /frontend
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build
RUN npm install -g serve

FROM nginx:1.19
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /frontend/build /usr/share/nginx/html
EXPOSE 80