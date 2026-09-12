@extends('help.layout')

@section('title', 'Help Center')

@section('content')
    <section style="padding:64px 0 40px;border-bottom:1px solid var(--border);background:radial-gradient(circle at 50% 0%, rgba(109,105,242,.12), transparent 60%)">
        <div class="wrap" style="text-align:center">
            <h1 style="font-size:34px;font-weight:700;letter-spacing:-.02em;margin:0 0 12px">How can we help?</h1>
            <p class="muted" style="font-size:15px;margin:0 0 28px">Search our knowledge base or browse a topic below.</p>

            <form action="{{ route('help.search') }}" method="GET" style="max-width:560px;margin:0 auto;display:flex;gap:10px">
                <input
                    type="search"
                    name="q"
                    placeholder="Search articles, guides, and FAQs…"
                    style="flex:1;padding:12px 16px;border-radius:10px;border:1px solid var(--border2);background:var(--panel);color:var(--fg);font-size:14px;font-family:inherit"
                >
                <button type="submit" class="btn btn-primary">Search</button>
            </form>

            @if ($suggestions->isNotEmpty())
                <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px">
                    @foreach ($suggestions as $article)
                        <a
                            href="{{ route('help.article', [$article->section->category->slug, $article->section->slug, $article->slug]) }}"
                            style="padding:6px 14px;border-radius:999px;border:1px solid var(--border2);font-size:12.5px;color:var(--fg2)"
                        >{{ $article->title }}</a>
                    @endforeach
                </div>
            @endif
        </div>
    </section>

    @if ($recent !== null)
        <section class="wrap" style="padding:40px 0 0">
            <div class="card" style="padding:22px">
                <h2 style="font-size:16px;font-weight:600;margin:0 0 14px">Your recent requests</h2>
                @if ($recent->isEmpty())
                    <p class="muted" style="margin:0;font-size:13px">No requests yet.</p>
                @else
                    @foreach ($recent as $t)
                        <a
                            href="{{ route('help.request', $t->id) }}"
                            style="display:flex;justify-content:space-between;gap:16px;padding:10px 0;color:var(--fg);font-size:13.5px;{{ $loop->first ? '' : 'border-top:1px solid var(--border)' }}"
                        >
                            <span>{{ $t->subject }}</span>
                            <span class="faint" style="font-size:12.5px;flex-shrink:0">{{ $t->updated_at->diffForHumans() }}</span>
                        </a>
                    @endforeach
                @endif
            </div>
        </section>
    @endif

    <section class="wrap" style="padding:40px 0 64px">
        <h2 style="font-size:19px;font-weight:600;margin:0 0 20px">Browse by topic</h2>

        @if ($categories->isEmpty())
            <p class="muted">No help articles are published yet.</p>
        @else
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
                @foreach ($categories as $category)
                    <a href="{{ route('help.topic', $category->slug) }}" class="card" style="display:block;padding:20px;color:var(--fg)">
                        <div style="width:38px;height:38px;border-radius:10px;background:{{ $category->color ?? '#8b8b95' }}26;color:{{ $category->color ?? '#8b8b95' }};display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:14px">{{ $category->icon ?? '◇' }}</div>
                        <div style="font-size:15px;font-weight:600;margin-bottom:6px">{{ $category->name }}</div>
                        @if ($category->description)
                            <div class="muted" style="font-size:13px;margin-bottom:10px">{{ $category->description }}</div>
                        @endif
                        <div class="faint" style="font-size:12.5px">{{ $category->published_count }} {{ Str::plural('article', $category->published_count) }}</div>
                    </a>
                @endforeach
            </div>
        @endif
    </section>
@endsection
