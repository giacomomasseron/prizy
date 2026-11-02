<!doctype html>
<html lang="en">
<head>
    @include('help.partials.head')
    <title>@yield('title', 'Help Center') — {{ \App\Models\Workspace::current()?->name ?? 'Prizy' }} Support</title>
    @hasSection('robots')
        <meta name="robots" content="@yield('robots')">
    @endif
</head>
<body>
    <a href="#content" class="hc-skip">Skip to content</a>
    <header class="hc-header">
        <div class="hc-wrap hc-header__bar">
            @php
                // The layout is shared with the portal views, whose controllers pass
                // none of these — hence defaults rather than required variables.
                $helpLang = $lang ?? \App\Services\KbLocales::SOURCE;
                $helpAvailable = $available ?? null;
                // The part of the Help Center this page belongs to, marked as current in the nav: the knowledge
                // base, the contact's requests, or the new-request form (none on sign-in and link-expired).
                $helpCurrent = request()->routeIs('help.home', 'help.search', 'help.topic', 'help.article') ? 'kb'
                    : (request()->routeIs('help.requests', 'help.request') ? 'requests'
                    : (request()->routeIs('help.new') ? 'new' : null));
            @endphp
            <a href="{{ \App\Services\HelpLocale::url('help.home', [], $helpLang) }}" class="hc-brand">
                <span class="hc-mark" aria-hidden="true">P</span>
                <span class="hc-brand__name">{{ \App\Models\Workspace::current()?->name ?? 'Prizy' }} Support</span>
            </a>
            <nav class="hc-nav" aria-label="Help center">
                <a href="{{ \App\Services\HelpLocale::url('help.home', [], $helpLang) }}" @if ($helpCurrent === 'kb') aria-current="page" @endif>Help center</a>
                @if (auth('contact')->check())
                    <a href="{{ route('help.requests') }}" @if ($helpCurrent === 'requests') aria-current="page" @endif>My requests</a>
                    <a href="{{ route('help.new') }}" @if ($helpCurrent === 'new') aria-current="page" @endif>Submit a request</a>
                @endif
            </nav>
            <div class="hc-header__spacer"></div>
            {{-- The switcher is scoped to the four knowledge-base pages, which pass
                 helpRoute. The portal views (sign-in, requests, submit-a-request,
                 link-expired) never set it: they have no locale to switch (this
                 slice does not translate the interface), and without a real
                 helpRoute a language link would bounce a reader off their own
                 ticket page to the help home. --}}
            @if (isset($helpRoute))
                <details class="hc-switcher">
                    <summary class="hc-btn">
                        <span aria-hidden="true">🌐</span>{{ \App\Services\KbLocales::name($helpLang) }}
                    </summary>
                    <div class="hc-switcher__menu">
                        <div class="hc-switcher__label">Read this help center in</div>
                        @foreach (\App\Services\KbLocales::NAMES as $code => $name)
                            <a href="{{ \App\Services\HelpLocale::url($helpRoute, $helpRouteParams ?? [], $code) }}" class="hc-switcher__item" @if ($code === $helpLang) aria-current="true" @endif>
                                <span aria-hidden="true" class="hc-dot{{ $code === $helpLang ? '' : ' hc-dot--none' }}"></span>
                                <span class="hc-switcher__name">{{ $name }}</span>
                                {{-- Only an article page can say whether THIS article exists in a language. --}}
                                @if ($helpAvailable !== null && $code !== \App\Services\KbLocales::SOURCE)
                                    @if (in_array($code, $helpAvailable, true))
                                        <span aria-hidden="true" class="hc-switcher__has">✓</span>
                                    @else
                                        <span class="hc-switcher__only">English only</span>
                                    @endif
                                @endif
                            </a>
                        @endforeach
                    </div>
                </details>
            @endif
            <div class="hc-account">
                @if (auth('contact')->check())
                    @php $contactOrg = auth('contact')->user()->contactMetadata->firstWhere('key', 'organization')?->value; @endphp
                    <span class="hc-account__who hc-muted">
                        {{ auth('contact')->user()->name }}
                        @if (filled($contactOrg))
                            <span class="hc-faint">· {{ $contactOrg }}</span>
                        @endif
                    </span>
                    <form method="POST" action="{{ route('help.logout') }}">@csrf<button type="submit" class="hc-btn">Sign out</button></form>
                @else
                    <a href="{{ route('help.login') }}" class="hc-btn">Sign in</a>
                @endif
            </div>
        </div>
    </header>
    <main id="content" class="hc-main">@yield('content')</main>
    <footer class="hc-footer">
        <div class="hc-wrap hc-footer__inner">© {{ date('Y') }} Prizy</div>
    </footer>
</body>
</html>
