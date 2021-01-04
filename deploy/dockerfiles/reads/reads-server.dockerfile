FROM nginx:stable-alpine

# Placeholder value replaced in K8S deployment.
ENV INGRESS_IP=127.0.0.1

COPY deploy/dockerfiles/reads/reads-base.nginx.conf /etc/nginx/reads-base.nginx.conf.template
COPY deploy/dockerfiles/reads/reads.nginx.conf /etc/nginx/conf.d/default.conf

CMD envsubst "\$INGRESS_IP" < /etc/nginx/reads-base.nginx.conf.template > /etc/nginx/reads-base.nginx.conf && nginx -g "daemon off;"
