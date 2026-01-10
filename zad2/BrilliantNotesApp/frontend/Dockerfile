FROM nginx:alpine

# Usuwam domyślną stronę nginx
RUN rm -rf /usr/share/nginx/html/*

# Kopiuję frontend
COPY . /usr/share/nginx/html

EXPOSE 80
