<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Prizy') }}</title>
    {{-- Where sign-up lives (APP_SIGNUP_HOST), for links to it from a workspace host. --}}
    <meta name="prizy-signup-url" content="{{ \App\Services\SignupHost::url() }}">
    <script>
    (function(){
        var t=null;
        try{t=localStorage.getItem('prizy-theme');}catch(e){}
        document.documentElement.dataset.theme=(t==='dark')?'dark':'light';
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
