@extends('help.layout')

@section('title', 'My requests')

@section('content')
    <section class="hc-wrap hc-page">
        <h1 class="hc-title hc-title--page">My requests</h1>
        <p class="hc-lead hc-lead--tight">Everything you have sent us.</p>

        <div class="hc-toolbar">
            @php $tabs = ['all' => 'All', 'open' => 'Open', 'solved' => 'Solved']; @endphp
            <nav class="hc-seg" aria-label="Filter requests">
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
                        class="hc-seg__item"
                        @if ($filter === $key) aria-current="true" @endif
                    >{{ $label }} <span class="hc-seg__count">{{ $counts[$key] }}</span></a>
                @endforeach
            </nav>
            <form method="GET" action="{{ route('help.requests') }}" class="hc-findbox" role="search">
                <span aria-hidden="true" class="hc-faint">⌕</span>
                @if ($filter !== 'all')
                    <input type="hidden" name="f" value="{{ $filter }}">
                @endif
                <label for="requests-search" class="sr-only">Search your requests</label>
                <input
                    type="search"
                    id="requests-search"
                    name="q"
                    value="{{ $q }}"
                    placeholder="Search your requests"
                    class="hc-findbox__input"
                >
                {{-- Enter submits; the button is there for assistive technology. --}}
                <button type="submit" class="sr-only">Search</button>
            </form>
            <a href="{{ route('help.new') }}" class="hc-btn hc-btn--tool"><span aria-hidden="true">＋</span> New request</a>
        </div>

        <div class="hc-card hc-table">
            <div class="hc-table__head" aria-hidden="true">
                <div>Status</div><div>Subject</div><div>Handled by</div><div class="hc-table__end">Last activity</div>
            </div>
            @forelse ($tickets as $t)
                <a href="{{ route('help.request', $t->id) }}" class="hc-table__row">
                    @include('help.partials.status', ['status' => $t->status])
                    <span class="hc-table__subject">
                        <span class="hc-row__title" title="{{ $t->subject }}">{{ $t->subject }}</span>
                        <span class="hc-row__sub">
                            <span class="hc-mono">#{{ substr($t->id, 0, 8) }}</span>
                            @if ($t->unread)
                                <span class="hc-chip hc-chip--sup">New reply</span>
                            @endif
                        </span>
                    </span>
                    <span class="hc-table__agent">
                        @include('help.partials.avatar', ['name' => $t->assignee?->name, 'tone' => $t->assignee ? 'agent' : 'none', 'size' => 'sm'])
                        <span class="hc-table__agent-name">{{ $t->assignee?->name ?? 'Awaiting assignment' }}</span>
                    </span>
                    <span class="hc-table__when hc-table__end">{{ $t->updated_at->diffForHumans() }}</span>
                </a>
            @empty
                <div class="hc-table__empty">
                    <div class="hc-table__empty-title">No requests match</div>
                    <div class="hc-table__empty-hint">Try another filter, or start a new request.</div>
                </div>
            @endforelse
        </div>
    </section>
@endsection
