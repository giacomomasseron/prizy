@extends('help.layout')

@section('title', 'Help Center')

@section('content')
    @php
        $contact = auth('contact')->user();
        $firstName = $contact ? \Illuminate\Support\Str::before(trim((string) $contact->name), ' ') : '';
        $articleTotal = $categories->sum('published_count');
    @endphp
    <section class="hc-hero">
        <div class="hc-wrap">
            {{-- A signed-in contact is greeted by first name, which alone carries the highlighter. --}}
            @if ($firstName !== '')
                <h1 class="hc-hero__title">How can we help, <span class="hl">{{ $firstName }}</span>?</h1>
            @else
                <h1 class="hc-hero__title"><span class="hl">How can we help?</span></h1>
            @endif
            <p class="hc-hero__lead">Search our guides, check on a request you've already sent us, or start a new one.</p>

            <form action="{{ route('help.search') }}" method="GET" class="hc-search" role="search">
                <span class="hc-search__icon" aria-hidden="true">⌕</span>
                <label for="help-search" class="sr-only">Search articles</label>
                <input
                    type="search"
                    id="help-search"
                    name="q"
                    placeholder="Search articles, guides, and FAQs…"
                    class="hc-search__input"
                >
                {{-- A GET form serialises only its own inputs, so a lang in the
                     action URL's query string would be silently dropped on submit. --}}
                @if ($lang !== \App\Services\KbLocales::SOURCE)
                    <input type="hidden" name="lang" value="{{ $lang }}">
                @endif
                <button type="submit" class="hc-search__go">Search</button>
            </form>

            @if ($suggestions->isNotEmpty())
                <div class="hc-suggestions">
                    @foreach ($suggestions as $article)
                        <a
                            href="{{ \App\Services\HelpLocale::url('help.article', [$article->section->category->slug, $article->section->slug, $article->slug], $lang) }}"
                            class="hc-pill"
                        >{{ $article->display_title }}</a>
                    @endforeach
                </div>
            @endif
        </div>
    </section>

    <div class="hc-wrap hc-home">
        <section>
            <div class="hc-h2row">
                <h2 class="hc-h2">Browse by topic</h2>
                @if ($articleTotal > 0)
                    <span class="hc-h2row__note">{{ $articleTotal }} {{ Str::plural('article', $articleTotal) }}</span>
                @endif
            </div>

            @if ($categories->isEmpty())
                <p class="hc-empty">No help articles are published yet.</p>
            @else
                <div class="hc-topics">
                    @foreach ($categories as $category)
                        <a href="{{ \App\Services\HelpLocale::url('help.topic', [$category->slug], $lang) }}" class="hc-card hc-topic">
                            {{-- The category's colour is data: an 18% tint over the panel; the glyph stays ink. --}}
                            <div class="hc-tile" aria-hidden="true" @if ($category->color) style="background:color-mix(in srgb, {{ $category->color }} 18%, var(--panel))" @endif>{{ $category->icon ?? '◇' }}</div>
                            <div class="hc-topic__name">{{ $category->name }}</div>
                            @if ($category->description)
                                <div class="hc-topic__desc">{{ $category->description }}</div>
                            @endif
                            <div class="hc-topic__count">{{ $category->published_count }} {{ Str::plural('article', $category->published_count) }}</div>
                        </a>
                    @endforeach
                </div>
            @endif
        </section>

        @if ($popular->isNotEmpty())
            <section>
                <div class="hc-h2row">
                    <h2 class="hc-h2">Popular articles</h2>
                </div>
                <div class="hc-card hc-rows">
                    @foreach ($popular as $article)
                        <a
                            href="{{ \App\Services\HelpLocale::url('help.article', [$article->section->category->slug, $article->section->slug, $article->slug], $lang) }}"
                            class="hc-row"
                        >
                            <span class="hc-row__main">
                                <span class="hc-row__title">{{ $article->display_title }}</span>
                                <span class="hc-row__sub">{{ $article->section->category->name }}</span>
                            </span>
                            {{-- Read in another language: say which articles will open in English. --}}
                            @if (! $article->translated)
                                <span class="hc-chip hc-chip--outline">English only</span>
                            @endif
                            <span class="hc-row__go" aria-hidden="true">›</span>
                        </a>
                    @endforeach
                </div>
            </section>
        @endif

        @if ($recent !== null)
            <section>
                <div class="hc-h2row">
                    <h2 class="hc-h2">Your recent requests</h2>
                    @if ($recentTotal > 0)
                        <a href="{{ route('help.requests') }}" class="hc-h2row__link">View all {{ $recentTotal }} <span aria-hidden="true">↗</span></a>
                    @endif
                </div>
                @if ($recent->isEmpty())
                    <p class="hc-empty">No requests yet.</p>
                @else
                    <div class="hc-card hc-rows">
                        @foreach ($recent as $t)
                            <a href="{{ route('help.request', $t->id) }}" class="hc-row">
                                @include('help.partials.status', ['status' => $t->status])
                                <span class="hc-row__main">
                                    <span class="hc-row__title">{{ $t->subject }}</span>
                                    <span class="hc-row__sub"><span class="hc-mono">#{{ substr($t->id, 0, 8) }}</span> · {{ $t->updated_at->diffForHumans() }}</span>
                                </span>
                                @if ($t->unread)
                                    <span class="hc-chip hc-chip--sup">New reply</span>
                                @endif
                                <span class="hc-row__go" aria-hidden="true">›</span>
                            </a>
                        @endforeach
                    </div>
                @endif
            </section>
        @endif
    </div>
@endsection
