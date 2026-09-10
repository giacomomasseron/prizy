<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Help Center') — {{ \App\Models\Workspace::current()?->name ?? 'Prizy' }} Support</title>
    @hasSection('robots')
        <meta name="robots" content="@yield('robots')">
    @endif
    <style>
        :root{--bg:#0b0b0d;--bg2:#111114;--panel:#151519;--border:#232327;--border2:#31313a;--fg:#eeeef1;--fg2:#a8a8b2;--fg3:#8b8b95;--hover:rgba(255,255,255,.06);--accent:#6d69f2;--sup:#3aa76d;--sup2:rgba(58,167,109,.15);--red:#eb5757;--amber:#e0a13a;--green:#4bab66;--blue:#5b8def;--purple:#b06ae0}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{min-height:100vh;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
        a{color:var(--sup);text-decoration:none}
        a:hover{color:#5cc78c}
        .wrap{max-width:1080px;margin:0 auto;padding:0 28px;width:100%}
        .card{border:1px solid var(--border);border-radius:13px;background:var(--panel)}
        .muted{color:var(--fg2)}.faint{color:var(--fg3)}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;border-radius:9px;border:1px solid var(--border2);background:var(--panel);color:var(--fg);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn:hover{background:var(--hover)}
        .btn-primary{background:var(--sup);border-color:var(--sup);color:#fff}
        article.kb h2{font-size:19px;margin:28px 0 10px}
        article.kb ul,article.kb ol{padding-left:22px}
        article.kb li{margin:4px 0}
        article.kb code{background:var(--bg2);border:1px solid var(--border);border-radius:5px;padding:1px 5px;font-size:12.5px}
        article.kb p{margin:12px 0;line-height:1.65}
    </style>
</head>
<body>
    <header style="position:sticky;top:0;z-index:20;background:rgba(11,11,13,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)">
        <div class="wrap" style="height:62px;display:flex;align-items:center;gap:14px">
            <a href="/help" style="display:flex;align-items:center;gap:10px;color:var(--fg)">
                <span style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#6d69f2,#3aa76d);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#fff">P</span>
                <span style="font-size:15px;font-weight:600;letter-spacing:-.03em">{{ \App\Models\Workspace::current()?->name ?? 'Prizy' }} Support</span>
            </a>
            <nav style="margin-left:8px;display:flex;gap:4px">
                <a href="/help" style="padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;background:var(--hover);color:var(--fg)">Help center</a>
                @if (auth('contact')->check())
                    <a href="{{ route('help.requests') }}" style="padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;color:var(--fg2)">My requests</a>
                @endif
            </nav>
            <div style="flex:1"></div>
            @if (auth('contact')->check())
                <span style="font-size:12.5px" class="muted">{{ auth('contact')->user()->name }}</span>
                <form method="POST" action="{{ route('help.logout') }}">@csrf<button type="submit" class="btn" style="font-weight:500">Sign out</button></form>
            @else
                <a href="{{ route('help.login') }}" class="btn">Sign in</a>
            @endif
        </div>
    </header>
    <main style="flex:1">@yield('content')</main>
    <footer style="border-top:1px solid var(--border);background:var(--bg2)">
        <div class="wrap" style="padding:22px 28px;font-size:12px;color:var(--fg3)">© {{ date('Y') }} Prizy</div>
    </footer>
</body>
</html>
