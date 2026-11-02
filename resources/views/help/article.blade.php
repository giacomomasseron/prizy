@extends('help.layout')

@section('title', $title)

@section('content')
    <div class="hc-wrap hc-wrap--narrow hc-page">
        <nav class="hc-crumbs" aria-label="Breadcrumb">
            <a href="{{ \App\Services\HelpLocale::url('help.home', [], $lang) }}">Help center</a>
            › <a href="{{ \App\Services\HelpLocale::url('help.topic', [$category->slug], $lang) }}">{{ $category->name }}</a>
            › {{ $section->name }}
        </nav>

        @if ($is_fallback)
            <div class="hc-notice">
                <span class="hc-notice__text">This article isn't available in {{ \App\Services\KbLocales::name($lang) }} yet — showing the English version.</span>
                <a href="{{ \App\Services\HelpLocale::url('help.article', [$category->slug, $section->slug, $article->slug]) }}">Switch to English</a>
            </div>
        @endif

        {{-- WCAG 2.1 AA 3.1.2 (Language of Parts): mark the translated passage
             only when it actually IS the translation. On a fallback the body is
             genuinely English (the page chrome's own language), so lang here
             would mislabel it — $is_fallback is the definitive signal. The lang
             attribute stays first on the h1: a test pins `<h1 lang="…"`. --}}
        <h1 @if (! $is_fallback)lang="{{ $lang }}" @endif class="hc-title">{{ $title }}</h1>
        <div class="hc-article__updated">Updated {{ $updated_at->format('M j, Y') }}</div>

        <article class="kb" @if (! $is_fallback)lang="{{ $lang }}"@endif>{!! $html !!}</article>

        <div class="hc-card hc-feedback">
            @if (request()->query('voted'))
                <p class="hc-feedback__thanks">Thanks for the feedback!</p>
            @else
                <p class="hc-feedback__q">Was this helpful?</p>
                <div class="hc-actions hc-actions--center">
                    <form action="{{ route('help.feedback', $article->id) }}" method="POST">
                        @csrf
                        <input type="hidden" name="vote" value="up">
                        <button type="submit" class="hc-btn">Yes</button>
                    </form>
                    <form action="{{ route('help.feedback', $article->id) }}" method="POST">
                        @csrf
                        <input type="hidden" name="vote" value="down">
                        <button type="submit" class="hc-btn">No</button>
                    </form>
                </div>
            @endif
        </div>

        @if ($related->isNotEmpty())
            <div class="hc-related">
                <h2 class="hc-card__title">Related articles</h2>
                <ul class="hc-list">
                    @foreach ($related as $r)
                        <li><a href="{{ \App\Services\HelpLocale::url('help.article', [$category->slug, $section->slug, $r->slug], $lang) }}">{{ $r->display_title }}</a></li>
                    @endforeach
                </ul>
            </div>
        @endif
    </div>
@endsection
