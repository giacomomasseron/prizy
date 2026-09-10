@extends('help.layout')

@section('title', $ticket->subject)

@section('content')
    @php
        $statusColors = [
            'new' => 'var(--blue)', 'open' => 'var(--accent)',
            'pending' => 'var(--amber)', 'on_hold' => 'var(--amber)',
            'solved' => 'var(--sup)', 'closed' => 'var(--sup)',
        ];
        $statusHints = [
            'new' => "We've received your request and will take a look soon.",
            'open' => 'Our team is actively working on this.',
            'pending' => "We're waiting on more information from you.",
            'on_hold' => "We're waiting on more information from you.",
            'solved' => 'This request has been marked as solved.',
            'closed' => 'This request has been marked as solved.',
        ];
        $solved = in_array($ticket->status, ['solved', 'closed'], true);
    @endphp

    <section class="wrap" style="padding:40px 28px;max-width:980px">
        <a href="{{ route('help.requests') }}" class="muted" style="font-size:13px;display:inline-block;margin-bottom:18px">‹ All requests</a>

        <div style="display:grid;grid-template-columns:1fr 300px;gap:32px;align-items:start">
            <div style="min-width:0">
                <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid {{ $statusColors[$ticket->status] ?? 'var(--border2)' }};color:{{ $statusColors[$ticket->status] ?? 'var(--fg3)' }};margin-bottom:10px">
                    {{ $statusLabel }}
                </span>
                <h1 style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0 0 8px">{{ $ticket->subject }}</h1>
                <p class="faint" style="font-size:12.5px;margin:0 0 26px">
                    #{{ strtoupper(substr($ticket->id, 0, 8)) }} · opened {{ $ticket->created_at->diffForHumans() }} · via {{ ucfirst($ticket->channel) }}
                </p>

                <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:28px">
                    @foreach ($conversation as $item)
                        @if ($item['kind'] === 'event')
                            <div style="display:flex;align-items:center;gap:10px;font-size:12.5px" class="muted">
                                <span style="width:20px;height:20px;flex-shrink:0;border-radius:999px;background:var(--hover);display:flex;align-items:center;justify-content:center;font-size:11px">{{ $item['icon'] }}</span>
                                <span>{{ $item['label'] }}</span>
                                <span class="faint">· {{ $item['at']->diffForHumans() }}</span>
                            </div>
                        @else
                            <div class="card" style="padding:14px 16px">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12.5px">
                                    <strong>{{ $item['name'] }}</strong>
                                    <span class="faint" style="padding:1px 7px;border-radius:999px;background:var(--hover)">{{ $item['mine'] ? 'You' : 'Prizy Support' }}</span>
                                    <span class="faint">{{ $item['at']->diffForHumans() }}</span>
                                </div>
                                <div style="white-space:pre-wrap;line-height:1.6">{{ $item['body'] }}</div>
                            </div>
                        @endif
                    @endforeach
                </div>

                <form method="POST" action="{{ route('help.request.reply', $ticket->id) }}" class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
                    @csrf
                    <textarea
                        name="body"
                        rows="4"
                        placeholder="{{ $solved ? 'Reply here to reopen this request…' : 'Add a reply…' }}"
                        style="resize:vertical;border:1px solid var(--border2);border-radius:10px;background:var(--bg2);color:var(--fg);font-size:13.5px;font-family:inherit;padding:11px 13px;outline:none"
                    >{{ old('body') }}</textarea>
                    @error('body')
                        <span style="color:var(--red);font-size:12.5px">{{ $message }}</span>
                    @enderror
                    <button type="submit" class="btn btn-primary" style="align-self:flex-end">Send reply</button>
                </form>
            </div>

            <aside class="card" style="padding:18px;display:flex;flex-direction:column;gap:18px">
                <div>
                    <div class="faint" style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Status</div>
                    <div style="font-size:14px;font-weight:600;margin-bottom:4px">{{ $statusLabel }}</div>
                    <div class="muted" style="font-size:12.5px">{{ $statusHints[$ticket->status] ?? '' }}</div>
                </div>
                <div>
                    <div class="faint" style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Handled by</div>
                    <div style="font-size:13.5px">{{ $ticket->assignee?->name ?? 'Awaiting assignment' }}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px" class="muted">
                    <div style="display:flex;justify-content:space-between"><span>Request ID</span><span>#{{ strtoupper(substr($ticket->id, 0, 8)) }}</span></div>
                    <div style="display:flex;justify-content:space-between"><span>Opened</span><span>{{ $ticket->created_at->diffForHumans() }}</span></div>
                    <div style="display:flex;justify-content:space-between"><span>Channel</span><span>{{ ucfirst($ticket->channel) }}</span></div>
                </div>
                @unless ($solved)
                    <form method="POST" action="{{ route('help.request.solve', $ticket->id) }}">
                        @csrf
                        <button type="submit" class="btn" style="width:100%;justify-content:center">Mark as solved</button>
                    </form>
                @endunless
            </aside>
        </div>
    </section>
@endsection
