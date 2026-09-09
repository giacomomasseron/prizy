<?php

// Set test environment variables before anything loads so that
// Dotenv (createImmutable) sees them as "already set" and
// config() reads them correctly inside the Docker env.
putenv('APP_ENV=testing');
putenv('APP_KEY=base64:pmn0c9M0oMUilr6532CVbcKkgGtN0LBTyYDXMzOzuUc=');
putenv('BCRYPT_ROUNDS=4');
putenv('BROADCAST_CONNECTION=log');
putenv('CACHE_STORE=array');
putenv('DB_CONNECTION=pgsql');
putenv('DB_HOST=postgres');
putenv('DB_PORT=5432');
putenv('DB_DATABASE=prizy_test');
putenv('DB_USERNAME=prizy_app');
putenv('DB_PASSWORD=secret');
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
$_ENV['BROADCAST_CONNECTION'] = 'log';
$_ENV['CACHE_STORE'] = 'array';
$_ENV['DB_CONNECTION'] = 'pgsql';
$_ENV['DB_HOST'] = 'postgres';
$_ENV['DB_PORT'] = '5432';
$_ENV['DB_DATABASE'] = 'prizy_test';
$_ENV['DB_USERNAME'] = 'prizy_app';
$_ENV['DB_PASSWORD'] = 'secret';
$_ENV['DB_URL'] = '';
$_ENV['MAIL_MAILER'] = 'array';
$_ENV['QUEUE_CONNECTION'] = 'sync';
$_ENV['SESSION_DRIVER'] = 'array';
$_ENV['PULSE_ENABLED'] = 'false';
$_ENV['TELESCOPE_ENABLED'] = 'false';
$_ENV['NIGHTWATCH_ENABLED'] = 'false';

$_SERVER['APP_ENV'] = 'testing';
$_SERVER['APP_KEY'] = 'base64:pmn0c9M0oMUilr6532CVbcKkgGtN0LBTyYDXMzOzuUc=';
// config('broadcasting.default') resolves from $_SERVER in this environment
// (the putenv/$_ENV overrides above are not enough), so this entry is the one
// that actually keeps tests off the real `reverb` connection. `log` (not
// `null`) mirrors `composer dev`'s queue:listen, which also runs with
// BROADCAST_CONNECTION=log — so a ShouldBroadcast event still exercises the
// broadcast pipeline, just without a live socket server.
$_SERVER['BROADCAST_CONNECTION'] = 'log';
$_SERVER['SESSION_DRIVER'] = 'array';
$_SERVER['DB_CONNECTION'] = 'pgsql';
$_SERVER['DB_HOST'] = 'postgres';
$_SERVER['DB_PORT'] = '5432';
$_SERVER['DB_DATABASE'] = 'prizy_test';
$_SERVER['DB_USERNAME'] = 'prizy_app';
$_SERVER['DB_PASSWORD'] = 'secret';
$_SERVER['DB_URL'] = '';
$_SERVER['CACHE_STORE'] = 'array';
$_SERVER['QUEUE_CONNECTION'] = 'sync';

require __DIR__.'/../vendor/autoload.php';
