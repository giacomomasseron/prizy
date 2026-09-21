#!/bin/sh
# Prepares a container of the Prizy production image, then runs its command.
#
# Every role (fpm, queue worker, scheduler, Reverb) shares this entrypoint, so
# it must stay cheap and must exec the command it is given rather than
# assuming fpm.
set -e

# A named volume mounted at storage/ hides the skeleton baked into the image,
# so recreate it. Laravel fails at first render without framework/views.
for dir in \
    framework/cache/data \
    framework/sessions \
    framework/views \
    logs \
    app/public \
    app/private
do
    mkdir -p "/var/www/html/storage/$dir"
done

# Config is cached at boot, not at build: the values come from the
# environment, which does not exist at build time.
#
# Config and routes are cached for every role: they land in bootstrap/cache,
# which is per-container and races nothing.
php /var/www/html/artisan config:cache
php /var/www/html/artisan route:cache

# Compiled views are NOT. view:cache calls view:clear first, which unlinks the
# whole compiled-views directory and rewrites it non-atomically — and that
# directory is on the storage volume shared by fpm, the worker, the scheduler
# and Reverb. A worker booting seconds after the web app would empty it under a
# live fpm pool, and a request in that window fatals on a truncated view. Only
# the role that actually renders does it.
case "$1" in
    php-fpm) php /var/www/html/artisan view:cache ;;
esac

exec "$@"
