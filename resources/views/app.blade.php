<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Prizy') }}</title>
    @fonts
    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    <div id="app"></div>
</body>
</html>
