<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Prizy') }}</title>
    <script>
    (function(){
        var t=null;
        try{t=localStorage.getItem('prizy-theme');}catch(e){}
        document.documentElement.dataset.theme=(t==='light')?'light':'dark';
    })();
    </script>
    @fonts
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
</head>
<body class="antialiased">
    <div id="app"></div>
</body>
</html>
