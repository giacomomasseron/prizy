@extends('help.layout')

@section('title', 'My requests')

@section('content')
    <section class="hc-wrap hc-wrap--list hc-page">
        <h1 class="hc-title hc-title--sm hc-title--spaced">My requests</h1>

        <div class="hc-toolbar">
            @php $tabs = ['all' => 'All', 'open' => 'Open', 'solved' => 'Solved']; @endphp
            <nav class="hc-tabs" aria-label="Filter requests">
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
                        class="hc-pill"
                        @if ($filter === $key) aria-current="true" @endif
                    >{{ $label }} ({{ $counts[$key] }})</a>
                @endforeach
            </nav>
            <form method="GET" action="{{ route('help.requests') }}" class="hc-inline-form" role="search">
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
                    class="hc-field hc-field--pill"
                >
                <button type="submit" class="hc-btn">Search</button>
            </form>
        </div>

        @if ($tickets->isEmpty())
            <p class="hc-empty">No requests match</p>
        @else
            <div class="hc-tickets">
                @foreach ($tickets as $t)
                    <a href="{{ route('help.request', $t->id) }}" class="hc-card hc-ticket">
                        @include('help.partials.status', ['status' => $t->status])
                        <span class="hc-ticket__main">
                            <span class="hc-ticket__subject" title="{{ $t->subject }}">
                                {{ $t->subject }}
                                <span class="hc-ticket__id hc-mono">#{{ substr($t->id, 0, 8) }}</span>
                            </span>
                            <span class="hc-ticket__who">{{ $t->assignee?->name ?? 'Awaiting assignment' }}</span>
                        </span>
                        @if ($t->unread)
                            <span class="hc-chip hc-chip--accent">New reply</span>
                        @endif
                        <span class="hc-ticket__when">{{ $t->updated_at->diffForHumans() }}</span>
                    </a>
                @endforeach
            </div>
        @endif
    </section>
@endsection
