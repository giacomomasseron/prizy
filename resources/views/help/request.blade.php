@extends('help.layout')

@section('title', $ticket->subject)

@section('content')
    @php
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

    <section class="hc-wrap hc-wrap--request hc-page">
        <a href="{{ route('help.requests') }}" class="hc-back">‹ All requests</a>

        <div class="hc-request">
            <div>
                @include('help.partials.status', ['status' => $ticket->status])
                <h1 class="hc-title hc-title--sm hc-request__title">{{ $ticket->subject }}</h1>
                <p class="hc-meta hc-request__meta">
                    <span class="hc-mono">#{{ substr($ticket->id, 0, 8) }}</span> · opened {{ $ticket->created_at->diffForHumans() }} · via {{ ucfirst($ticket->channel) }}
                </p>

                <div class="hc-conv">
                    @foreach ($conversation as $item)
                        @if ($item['kind'] === 'event')
                            <div class="hc-event">
                                <span class="hc-event__icon" aria-hidden="true">{{ $item['icon'] }}</span>
                                <span>{{ $item['label'] }}</span>
                                <span class="hc-faint">· {{ $item['at']->diffForHumans() }}</span>
                            </div>
                        @else
                            <div class="hc-card hc-message">
                                <div class="hc-message__head">
                                    <strong>{{ $item['name'] }}</strong>
                                    <span class="hc-chip hc-chip--quiet">{{ $item['mine'] ? 'You' : 'Prizy Support' }}</span>
                                    <span class="hc-faint">{{ $item['at']->diffForHumans() }}</span>
                                </div>
                                <div class="hc-message__body">{{ $item['body'] }}</div>
                            </div>
                        @endif
                    @endforeach
                </div>

                @if (in_array($ticket->status, ['solved', 'closed'], true) && $ticket->csat_rating === null)
                    <div class="hc-card hc-rate">
                        <div class="hc-rate__q">How did we do?</div>
                        <div class="hc-rate__hint">Rate the support you got on this request.</div>
                        <div class="hc-actions">
                            <form method="POST" action="{{ route('help.request.rate', $ticket) }}">@csrf<input type="hidden" name="vote" value="up"><button type="submit" class="hc-btn">👍 Good</button></form>
                            <form method="POST" action="{{ route('help.request.rate', $ticket) }}">@csrf<input type="hidden" name="vote" value="down"><button type="submit" class="hc-btn">👎 Bad</button></form>
                        </div>
                    </div>
                @elseif ($ticket->csat_rating !== null)
                    <div class="hc-card hc-rated">
                        You rated this {{ $ticket->csat_rating === 'thumbs_up' ? '👍' : '👎' }} — thanks for the feedback.
                    </div>
                @endif

                <form method="POST" action="{{ route('help.request.reply', $ticket->id) }}" class="hc-card hc-reply">
                    @csrf
                    <label for="reply-body" class="sr-only">Your reply</label>
                    <textarea
                        id="reply-body"
                        name="body"
                        rows="4"
                        placeholder="{{ $solved ? 'Reply here to reopen this request…' : 'Add a reply…' }}"
                        class="hc-field"
                        @error('body') aria-invalid="true" aria-describedby="reply-body-error" @enderror
                    >{{ old('body') }}</textarea>
                    @error('body')
                        <span id="reply-body-error" class="hc-error" role="alert">{{ $message }}</span>
                    @enderror
                    <button type="submit" class="hc-btn hc-btn--primary">Send reply</button>
                </form>
            </div>

            <aside class="hc-card hc-side" aria-label="Request details">
                <div>
                    <div class="hc-side__label">Status</div>
                    <div class="hc-side__value">{{ $statusLabel }}</div>
                    <div class="hc-side__hint">{{ $statusHints[$ticket->status] ?? '' }}</div>
                </div>
                <div>
                    <div class="hc-side__label">Handled by</div>
                    <div class="hc-side__text">{{ $ticket->assignee?->name ?? 'Awaiting assignment' }}</div>
                </div>
                @if ($hasEscalation)
                    <div>
                        <div class="hc-side__label">Engineering</div>
                        <div class="hc-side__hint">This request is being worked on by our engineering team. We'll post here as soon as the fix ships — no action needed from you.</div>
                    </div>
                @endif
                @if ($relatedArticles->isNotEmpty())
                    <div>
                        <div class="hc-side__label">Related articles</div>
                        <div class="hc-side__links">
                            @foreach ($relatedArticles as $a)
                                <a href="{{ route('help.article', [$a->category_slug, $a->section_slug, $a->slug]) }}">{{ $a->title }}</a>
                            @endforeach
                        </div>
                    </div>
                @endif
                <div class="hc-facts">
                    <div><span>Request ID</span><span class="hc-mono">#{{ substr($ticket->id, 0, 8) }}</span></div>
                    <div><span>Opened</span><span>{{ $ticket->created_at->diffForHumans() }}</span></div>
                    <div><span>Channel</span><span>{{ ucfirst($ticket->channel) }}</span></div>
                </div>
                @unless ($solved)
                    <form method="POST" action="{{ route('help.request.solve', $ticket->id) }}">
                        @csrf
                        <button type="submit" class="hc-btn hc-btn--block">Mark as solved</button>
                    </form>
                @endunless
            </aside>
        </div>
    </section>
@endsection
