FROM nginx:alpine

# Usuwam domyślną stronę nginx
RUN rm -rf /usr/share/nginx/html/*

# Kopiuję frontend
COPY index.html /usr/share/nginx/html/
COPY *.js /usr/share/nginx/html/

EXPOSE 80
