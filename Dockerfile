FROM php:8.1-apache

RUN apt-get update && apt-get install -y \
    zip \
    unzip \
    git

COPY . /var/www/html

RUN curl -sS https://getcomposer.org/installer | php \
    && mv composer.phar /usr/local/bin/composer

WORKDIR /var/www/html

RUN composer install --no-dev --optimize-autoloader

RUN a2enmod rewrite

EXPOSE 80
