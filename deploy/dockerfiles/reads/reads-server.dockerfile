FROM nginx:stable-alpine

COPY deploy/dockerfiles/reads/reads-base.nginx.conf /etc/nginx/reads-base.nginx.conf
COPY deploy/dockerfiles/reads/reads.nginx.conf /etc/nginx/conf.d/default.conf
