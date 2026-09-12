@extends('help.layout')

@section('title', $category->name)

@section('content')
    <div class="wrap" style="padding:32px 0 64px">
        <a href="{{ route('help.home') }}" class="faint" style="font-size:13px">‹ Help center</a>

        <div style="display:flex;align-items:center;gap:14px;margin:20px 0 8px">
            <div style="width:44px;height:44px;border-radius:12px;background:{{ $category->color ?? '#8b8b95' }}26;color:{{ $category->color ?? '#8b8b95' }};display:flex;align-items:center;justify-content:center;font-size:20px">{{ $category->icon ?? '◇' }}</div>
            <h1 style="font-size:24px;font-weight:700;margin:0">{{ $category->name }}</h1>
        </div>
        @if ($category->description)
            <p class="muted" style="font-size:14px;margin:0 0 32px">{{ $category->description }}</p>
        @endif

        @if ($sections->isEmpty())
            <p class="muted">No articles are published in this topic yet.</p>
        @else
            <div style="display:flex;flex-direction:column;gap:16px">
                @foreach ($sections as $section)
                    <div class="card" style="padding:22px">
                        <h2 style="font-size:15px;font-weight:600;margin:0 0 14px">{{ $section->name }}</h2>
                        <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px">
                            @foreach ($section->published_articles as $article)
                                <li style="display:flex;justify-content:space-between;gap:12px">
                                    <a href="{{ route('help.article', [$category->slug, $section->slug, $article->slug]) }}">{{ $article->title }}</a>
                                    <span class="faint" style="font-size:12.5px;white-space:nowrap">Updated {{ $article->updated_at->format('M j, Y') }}</span>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
@endsection
