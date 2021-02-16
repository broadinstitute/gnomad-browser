FROM nginx:stable-alpine

COPY deploy/dockerfiles/blog/gcs-proxy.conf /etc/nginx/gcs-proxy.conf
COPY deploy/dockerfiles/blog/blog.nginx.conf /etc/nginx/blog.conf.template

CMD REAL_IP_CONFIG=$([ -z "${PROXY_IPS:-}" ] || echo "$PROXY_IPS" | awk 'BEGIN { RS="," } { print "set_real_ip_from " $1 ";" }') \
  envsubst "\$REAL_IP_CONFIG" < /etc/nginx/blog.conf.template > /etc/nginx/conf.d/default.conf && \
  nginx -g "daemon off;"
