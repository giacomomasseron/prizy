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
php /var/www/html/artisan config:cache
php /var/www/html/artisan route:cache
php /var/www/html/artisan view:cache

exec "$@"
