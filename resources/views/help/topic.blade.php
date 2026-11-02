@extends('help.layout')

@section('title', $category->name)

@section('content')
    <div class="hc-wrap hc-page">
        <a href="{{ \App\Services\HelpLocale::url('help.home', [], $lang) }}" class="hc-back">‹ Help center</a>

        <div class="hc-topic-head">
            <div class="hc-tile hc-tile--lg" aria-hidden="true" @if ($category->color) style="background:color-mix(in srgb, {{ $category->color }} 18%, var(--panel))" @endif>{{ $category->icon ?? '◇' }}</div>
            <h1 class="hc-title">{{ $category->name }}</h1>
        </div>
        @if ($category->description)
            <p class="hc-lead">{{ $category->description }}</p>
        @endif

        @if ($sections->isEmpty())
            <p class="hc-empty">No articles are published in this topic yet.</p>
        @else
            <div class="hc-sections">
                @foreach ($sections as $section)
                    <div class="hc-card hc-section-card">
                        <h2 class="hc-card__title">{{ $section->name }}</h2>
                        <ul class="hc-list">
                            @foreach ($section->published_articles as $article)
                                <li>
                                    <a href="{{ \App\Services\HelpLocale::url('help.article', [$category->slug, $section->slug, $article->slug], $lang) }}">{{ $article->display_title }}</a>
                                    <span class="hc-list__when">Updated {{ $article->updated_at->format('M j, Y') }}</span>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
@endsection
