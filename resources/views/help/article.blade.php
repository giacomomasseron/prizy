@extends('help.layout')

@section('title', $title)

@section('content')
    <div class="wrap" style="max-width:760px;padding:32px 0 72px">
        <div class="faint" style="font-size:13px;margin-bottom:18px">
            <a href="{{ \App\Services\HelpLocale::url('help.home', [], $lang) }}">Help center</a>
            › <a href="{{ \App\Services\HelpLocale::url('help.topic', [$category->slug], $lang) }}">{{ $category->name }}</a>
            › {{ $section->name }}
        </div>

        @if ($is_fallback)
            <div class="card" style="padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
                <span class="faint" style="font-size:13px;flex:1">This article isn't available in {{ \App\Services\KbLocales::name($lang) }} yet — showing the English version.</span>
                <a href="{{ \App\Services\HelpLocale::url('help.article', [$category->slug, $section->slug, $article->slug]) }}" style="font-size:13px;white-space:nowrap">Switch to English</a>
            </div>
        @endif

        <h1 style="font-size:26px;font-weight:700;margin:0 0 8px">{{ $title }}</h1>
        <div class="faint" style="font-size:12.5px;margin-bottom:28px">Updated {{ $updated_at->format('M j, Y') }}</div>

        <article class="kb">{!! $html !!}</article>

        <div class="card" style="padding:22px;margin-top:40px;text-align:center">
            @if (request()->query('voted'))
                <p style="margin:0;font-weight:600">Thanks for the feedback!</p>
            @else
                <p style="margin:0 0 12px;font-weight:600">Was this helpful?</p>
                <div style="display:flex;gap:10px;justify-content:center">
                    <form action="{{ route('help.feedback', $article->id) }}" method="POST">
                        @csrf
                        <input type="hidden" name="vote" value="up">
                        <button type="submit" class="btn">Yes</button>
                    </form>
                    <form action="{{ route('help.feedback', $article->id) }}" method="POST">
                        @csrf
                        <input type="hidden" name="vote" value="down">
                        <button type="submit" class="btn">No</button>
                    </form>
                </div>
            @endif
        </div>

        @if ($related->isNotEmpty())
            <div style="margin-top:40px">
                <h2 style="font-size:15px;font-weight:600;margin:0 0 14px">Related articles</h2>
                <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px">
                    @foreach ($related as $r)
                        <li><a href="{{ \App\Services\HelpLocale::url('help.article', [$category->slug, $section->slug, $r->slug], $lang) }}">{{ $r->title }}</a></li>
                    @endforeach
                </ul>
            </div>
        @endif
    </div>
@endsection
