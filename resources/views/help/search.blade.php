@extends('help.layout')

@section('title', 'Search — “' . $q . '”')
@section('robots', 'noindex')

@section('content')
    <div class="hc-wrap hc-wrap--narrow hc-page">
        <h1 class="hc-title hc-title--sm hc-title--spaced">Results for &ldquo;{{ $q }}&rdquo;</h1>

        @if ($results->isEmpty())
            <p class="hc-empty">No articles match.</p>
        @else
            <div class="hc-results">
                @foreach ($results as $r)
                    <div class="hc-card hc-result">
                        <div class="hc-result__cat">{{ $r->category_name }}</div>
                        <a href="{{ \App\Services\HelpLocale::url('help.article', [$r->category_slug, $r->section_slug, $r->slug], $lang) }}" class="hc-result__title">{{ $r->title }}</a>
                        <p class="hc-result__snippet">{!! $r->snippet_html !!}</p>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
@endsection
