@extends('help.layout')

@section('title', 'My requests')

@section('content')
    <section class="wrap" style="padding:48px 28px;max-width:860px">
        <h1 style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0 0 20px">My requests</h1>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px">
            @php $tabs = ['all' => 'All', 'open' => 'Open', 'solved' => 'Solved']; @endphp
            <div style="display:flex;gap:6px">
                @foreach ($tabs as $key => $label)
                    @php
                        // Explicit null-safe build (not array_filter): array_filter
                        // treats a literal q="0" as falsy and drops it, losing the
                        // search term from the tab links.
                        $tabParams = ['f' => $key];
                        if ($q !== '') {
                            $tabParams['q'] = $q;
                        }
                    @endphp
                    <a
                        href="{{ route('help.requests', $tabParams) }}"
                        style="padding:6px 13px;border-radius:999px;font-size:12.5px;font-weight:600;{{ $filter === $key ? 'background:var(--hover);color:var(--fg)' : 'color:var(--fg2)' }}"
                    >{{ $label }} ({{ $counts[$key] }})</a>
                @endforeach
            </div>
            <form method="GET" action="{{ route('help.requests') }}" style="display:flex;gap:8px">
                @if ($filter !== 'all')
                    <input type="hidden" name="f" value="{{ $filter }}">
                @endif
                <input
                    type="search"
                    name="q"
                    value="{{ $q }}"
                    placeholder="Search your requests"
                    style="width:220px;padding:9px 13px;border-radius:9px;border:1px solid var(--border2);background:var(--panel);color:var(--fg);font-size:13px;font-family:inherit"
                >
                <button type="submit" class="btn">Search</button>
            </form>
        </div>

        @php
            $statusColors = [
                'new' => 'var(--blue)', 'open' => 'var(--accent)',
                'pending' => 'var(--amber)', 'on_hold' => 'var(--amber)',
                'solved' => 'var(--sup)', 'closed' => 'var(--sup)',
            ];
        @endphp

        @if ($tickets->isEmpty())
            <p class="muted">No requests match</p>
        @else
            <div style="display:flex;flex-direction:column;gap:10px">
                @foreach ($tickets as $t)
                    <a href="{{ route('help.request', $t->id) }}" class="card" style="display:flex;align-items:center;gap:14px;padding:16px 18px;color:var(--fg)">
                        <span style="flex-shrink:0;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid {{ $statusColors[$t->status] ?? 'var(--border2)' }};color:{{ $statusColors[$t->status] ?? 'var(--fg3)' }}">
                            {{ \App\Repositories\PortalTicketRepository::STATUS_LABELS[$t->status] ?? ucfirst($t->status) }}
                        </span>
                        <span style="flex:1;min-width:0">
                            <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                                {{ $t->subject }}
                                <span class="faint" style="font-weight:500;font-size:12px">#{{ substr($t->id, 0, 8) }}</span>
                            </div>
                            <div class="faint" style="font-size:12.5px;margin-top:2px">{{ $t->assignee?->name ?? 'Awaiting assignment' }}</div>
                        </span>
                        @if ($t->unread)
                            <span class="btn-primary" style="flex-shrink:0;font-size:11px;padding:3px 9px;border-radius:999px;font-weight:600">New reply</span>
                        @endif
                        <span class="faint" style="font-size:12px;flex-shrink:0">{{ $t->updated_at->diffForHumans() }}</span>
                    </a>
                @endforeach
            </div>
        @endif
    </section>
@endsection
