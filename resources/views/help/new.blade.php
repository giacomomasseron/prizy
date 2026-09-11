@extends('help.layout')

@section('title', 'Submit a request')

@section('content')
    <section class="wrap" style="padding:48px 28px;max-width:720px">
        <h1 style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0 0 8px">Submit a request</h1>
        <p class="muted" style="margin:0 0 28px">Tell us what's going on and our team will get back to you.</p>

        <form method="POST" action="{{ route('help.new.store') }}" class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px">
            @csrf

            <div>
                <label for="subject" style="display:block;font-size:12.5px;font-weight:600;margin-bottom:6px">Subject</label>
                <input
                    type="text"
                    id="subject"
                    name="subject"
                    value="{{ old('subject') }}"
                    required
                    style="width:100%;padding:10px 13px;border-radius:9px;border:1px solid var(--border2);background:var(--bg2);color:var(--fg);font-size:13.5px;font-family:inherit;outline:none"
                >
                @error('subject')
                    <span style="color:var(--red);font-size:12.5px">{{ $message }}</span>
                @enderror
            </div>

            <div>
                <label for="priority" style="display:block;font-size:12.5px;font-weight:600;margin-bottom:6px">How urgent is it?</label>
                @php $priority = old('priority', 'normal'); @endphp
                <select
                    id="priority"
                    name="priority"
                    style="width:100%;padding:10px 13px;border-radius:9px;border:1px solid var(--border2);background:var(--bg2);color:var(--fg);font-size:13.5px;font-family:inherit;outline:none"
                >
                    <option value="urgent" @selected($priority === 'urgent')>Urgent — work is blocked</option>
                    <option value="high" @selected($priority === 'high')>High — a workaround exists</option>
                    <option value="normal" @selected($priority === 'normal')>Normal — needs attention</option>
                    <option value="low" @selected($priority === 'low')>Low — a question or idea</option>
                </select>
                @error('priority')
                    <span style="color:var(--red);font-size:12.5px">{{ $message }}</span>
                @enderror
            </div>

            <div>
                <label for="body" style="display:block;font-size:12.5px;font-weight:600;margin-bottom:6px">What happened?</label>
                <textarea
                    id="body"
                    name="body"
                    rows="6"
                    required
                    style="width:100%;resize:vertical;border:1px solid var(--border2);border-radius:10px;background:var(--bg2);color:var(--fg);font-size:13.5px;font-family:inherit;padding:11px 13px;outline:none"
                >{{ old('body') }}</textarea>
                @error('body')
                    <span style="color:var(--red);font-size:12.5px">{{ $message }}</span>
                @enderror
            </div>

            <div style="display:flex;align-items:center;gap:12px">
                <button type="submit" class="btn btn-primary">Submit request</button>
                <a href="{{ route('help.requests') }}" class="muted">Cancel</a>
            </div>
        </form>

        @if ($selfHelp->isNotEmpty())
            <div class="card" style="margin-top:24px;padding:18px">
                <div class="faint" style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">
                    Before you send — these may answer it
                </div>
                <div style="display:flex;flex-direction:column;gap:8px">
                    @foreach ($selfHelp as $a)
                        <a href="{{ route('help.article', [$a->section->category->slug, $a->section->slug, $a->slug]) }}" style="font-size:13.5px">
                            {{ $a->title }}
                        </a>
                    @endforeach
                </div>
            </div>
        @endif
    </section>
@endsection
