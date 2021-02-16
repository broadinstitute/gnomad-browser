FROM nginx:stable-alpine

COPY deploy/dockerfiles/reads/reads-base.nginx.conf /etc/nginx/reads-base.nginx.conf.template
COPY deploy/dockerfiles/reads/reads.nginx.conf /etc/nginx/conf.d/default.conf

CMD REAL_IP_CONFIG=$([ -z "${PROXY_IPS:-}" ] || echo "$PROXY_IPS" | awk 'BEGIN { RS="," } { print "set_real_ip_from " $1 ";" }') \
  envsubst "\$REAL_IP_CONFIG" < /etc/nginx/reads-base.nginx.conf.template > /etc/nginx/reads-base.nginx.conf && \
  nginx -g "daemon off;"
