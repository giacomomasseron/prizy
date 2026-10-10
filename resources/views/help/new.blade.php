@extends('help.layout')

@section('title', 'Submit a request')

@section('content')
    <section class="hc-wrap hc-wrap--form hc-page">
        <h1 class="hc-title hc-title--sm">Submit a request</h1>
        <p class="hc-lead">Tell us what's going on and our team will get back to you.</p>

        <form method="POST" action="{{ route('help.new.store') }}" class="hc-card hc-form">
            @csrf

            <div>
                <label for="subject" class="hc-label">Subject</label>
                <input
                    type="text"
                    id="subject"
                    name="subject"
                    value="{{ old('subject') }}"
                    required
                    class="hc-field"
                    @error('subject') aria-invalid="true" aria-describedby="subject-error" @enderror
                >
                @error('subject')
                    <span id="subject-error" class="hc-error" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div>
                <label for="priority" class="hc-label">How urgent is it?</label>
                @php $priority = old('priority', 'normal'); @endphp
                <select
                    id="priority"
                    name="priority"
                    class="hc-field"
                    @error('priority') aria-invalid="true" aria-describedby="priority-error" @enderror
                >
                    <option value="urgent" @selected($priority === 'urgent')>Urgent — work is blocked</option>
                    <option value="high" @selected($priority === 'high')>High — a workaround exists</option>
                    <option value="normal" @selected($priority === 'normal')>Normal — needs attention</option>
                    <option value="low" @selected($priority === 'low')>Low — a question or idea</option>
                </select>
                @error('priority')
                    <span id="priority-error" class="hc-error" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div>
                <label for="body" class="hc-label">What happened?</label>
                <textarea
                    id="body"
                    name="body"
                    rows="6"
                    required
                    class="hc-field"
                    @error('body') aria-invalid="true" aria-describedby="body-error" @enderror
                >{{ old('body') }}</textarea>
                @error('body')
                    <span id="body-error" class="hc-error" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="hc-form__actions">
                <button type="submit" class="hc-btn hc-btn--primary">Submit request</button>
                <a href="{{ route('help.requests') }}" class="hc-muted">Cancel</a>
            </div>
        </form>

        @if ($selfHelp->isNotEmpty())
            <div class="hc-card hc-help-links">
                <div class="hc-help-links__label">Before you send — these may answer it</div>
                <div class="hc-help-links__list">
                    @foreach ($selfHelp as $a)
                        <a href="{{ route('help.article', [$a->section->category->slug, $a->section->slug, $a->slug]) }}">
                            {{ $a->title }}
                        </a>
                    @endforeach
                </div>
            </div>
        @endif
    </section>
@endsection
