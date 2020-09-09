FROM nginx:stable-alpine

# Placeholder value replaced in K8S deployment.
ENV INGRESS_IP=127.0.0.1

COPY deploy/dockerfiles/blog/gcs-proxy.conf /etc/nginx/gcs-proxy.conf
COPY deploy/dockerfiles/blog/blog.nginx.conf /etc/nginx/blog.conf.template

CMD envsubst "\$INGRESS_IP" < /etc/nginx/blog.conf.template > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"
