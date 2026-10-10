@extends('help.layout')

@section('title', 'Help Center')

@section('content')
    <section class="hc-hero">
        <div class="hc-wrap">
            <h1 class="hc-hero__title"><span class="hl">How can we help?</span></h1>
            <p class="hc-hero__lead">Search our knowledge base or browse a topic below.</p>

            <form action="{{ route('help.search') }}" method="GET" class="hc-search" role="search">
                <label for="help-search" class="sr-only">Search articles</label>
                <input
                    type="search"
                    id="help-search"
                    name="q"
                    placeholder="Search articles, guides, and FAQs…"
                    class="hc-field hc-field--pill"
                >
                {{-- A GET form serialises only its own inputs, so a lang in the
                     action URL's query string would be silently dropped on submit. --}}
                @if ($lang !== \App\Services\KbLocales::SOURCE)
                    <input type="hidden" name="lang" value="{{ $lang }}">
                @endif
                <button type="submit" class="hc-btn hc-btn--primary">Search</button>
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

    @if ($recent !== null)
        <section class="hc-wrap hc-section">
            <div class="hc-card hc-recent">
                <h2 class="hc-card__title">Your recent requests</h2>
                @if ($recent->isEmpty())
                    <p class="hc-empty">No requests yet.</p>
                @else
                    @foreach ($recent as $t)
                        <a href="{{ route('help.request', $t->id) }}" class="hc-recent__row">
                            <span>{{ $t->subject }}</span>
                            <span class="hc-recent__when">{{ $t->updated_at->diffForHumans() }}</span>
                        </a>
                    @endforeach
                @endif
            </div>
        </section>
    @endif

    <section class="hc-wrap hc-section hc-section--last">
        <h2 class="hc-h2">Browse by topic</h2>

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
@endsection
