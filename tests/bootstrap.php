<?php

// Set test environment variables before anything loads so that
// Dotenv (createImmutable) sees them as "already set" and
// config() reads them correctly inside the Docker env.
putenv('APP_ENV=testing');
putenv('APP_KEY=base64:pmn0c9M0oMUilr6532CVbcKkgGtN0LBTyYDXMzOzuUc=');
putenv('BCRYPT_ROUNDS=4');
putenv('BROADCAST_CONNECTION=null');
putenv('CACHE_STORE=array');
putenv('DB_CONNECTION=sqlite');
putenv('DB_DATABASE=:memory:');
putenv('DB_URL=');
putenv('MAIL_MAILER=array');
putenv('QUEUE_CONNECTION=sync');
putenv('SESSION_DRIVER=array');
putenv('PULSE_ENABLED=false');
putenv('TELESCOPE_ENABLED=false');
putenv('NIGHTWATCH_ENABLED=false');

$_ENV['APP_ENV'] = 'testing';
$_ENV['APP_KEY'] = 'base64:pmn0c9M0oMUilr6532CVbcKkgGtN0LBTyYDXMzOzuUc=';
$_ENV['BCRYPT_ROUNDS'] = '4';
$_ENV['BROADCAST_CONNECTION'] = 'null';
$_ENV['CACHE_STORE'] = 'array';
$_ENV['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_DATABASE'] = ':memory:';
$_ENV['DB_URL'] = '';
$_ENV['MAIL_MAILER'] = 'array';
$_ENV['QUEUE_CONNECTION'] = 'sync';
$_ENV['SESSION_DRIVER'] = 'array';
$_ENV['PULSE_ENABLED'] = 'false';
$_ENV['TELESCOPE_ENABLED'] = 'false';
$_ENV['NIGHTWATCH_ENABLED'] = 'false';

$_SERVER['APP_ENV'] = 'testing';
$_SERVER['APP_KEY'] = 'base64:pmn0c9M0oMUilr6532CVbcKkgGtN0LBTyYDXMzOzuUc=';
$_SERVER['SESSION_DRIVER'] = 'array';
$_SERVER['DB_CONNECTION'] = 'sqlite';
$_SERVER['DB_DATABASE'] = ':memory:';
$_SERVER['DB_URL'] = '';
$_SERVER['CACHE_STORE'] = 'array';
$_SERVER['QUEUE_CONNECTION'] = 'sync';

require __DIR__ . '/../vendor/autoload.php';
