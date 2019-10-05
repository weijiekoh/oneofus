FROM nginx:1.17.1-alpine AS oou-frontend

COPY --from=oou-base /oou/frontend/build /static
COPY --from=oou-base /oou/frontend/nginx.conf /etc/nginx/nginx.conf

WORKDIR /

CMD nginx -c /etc/nginx/nginx.conf -g 'daemon off;'
