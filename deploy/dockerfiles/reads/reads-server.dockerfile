FROM --platform=linux/amd64 nginx:stable-alpine

COPY deploy/dockerfiles/reads/reads.nginx.conf /etc/nginx/reads.nginx.conf.template

CMD REAL_IP_CONFIG=$([ -z "${PROXY_IPS:-}" ] || echo "$PROXY_IPS" | awk 'BEGIN { RS="," } { print "set_real_ip_from " $1 ";" }') \
  envsubst "\$REAL_IP_CONFIG" < /etc/nginx/reads.nginx.conf.template > /etc/nginx/conf.d/default.conf && \
  nginx -g "daemon off;"
