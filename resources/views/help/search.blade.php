@extends('help.layout')

@section('title', 'Search — “' . $q . '”')

@section('content')
    <div class="wrap" style="max-width:760px;padding:32px 0 72px">
        <h1 style="font-size:20px;font-weight:600;margin:0 0 24px">Results for &ldquo;{{ $q }}&rdquo;</h1>

        @if ($results->isEmpty())
            <p class="muted">No articles match.</p>
        @else
            <div style="display:flex;flex-direction:column;gap:20px">
                @foreach ($results as $r)
                    <div class="card" style="padding:18px 20px">
                        <div class="faint" style="font-size:12px;margin-bottom:6px">{{ $r->category_name }}</div>
                        <a href="{{ route('help.article', [$r->category_slug, $r->section_slug, $r->slug]) }}" style="font-size:15px;font-weight:600">{{ $r->title }}</a>
                        <p class="muted" style="font-size:13.5px;margin:8px 0 0;line-height:1.6">{!! $r->snippet_html !!}</p>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
@endsection
