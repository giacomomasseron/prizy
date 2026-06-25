FROM php:8.5-cli

# Match the host user so bind-mounted files keep host ownership (Linux).
ARG UID=1000
ARG GID=1000

RUN apt-get update && apt-get install -y \
        git unzip libpq-dev libzip-dev libicu-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip intl pcntl \
    && pecl install redis && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Create a host-matching, non-root user. Guards tolerate a pre-existing uid/gid.
RUN (groupadd -g ${GID} app || true) \
    && (useradd -u ${UID} -g ${GID} -m -s /bin/bash app || true) \
    && mkdir -p /home/app/.composer && chown -R ${UID}:${GID} /home/app

ENV COMPOSER_HOME=/home/app/.composer
WORKDIR /var/www/html
USER ${UID}:${GID}
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
