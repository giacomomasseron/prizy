@extends('help.layout')

@section('title', 'Sign in')

@section('content')
    <section class="hc-wrap hc-wrap--solo hc-solo-page">
        <h1 class="hc-title hc-title--sm">Sign in to view your requests</h1>
        @if ($sent)
            <div class="hc-card hc-sent">
                <p>{{ "If that address has requests with us, we've emailed a sign-in link. It expires in 15 minutes." }}</p>
            </div>
        @else
            <p class="hc-lead">We'll email you a one-time link — no password needed.</p>
            <form method="POST" action="{{ route('help.login') }}" class="hc-card hc-form">
                @csrf
                <div>
                    <label for="email" class="hc-label">Email</label>
                    <input type="email" id="email" name="email" required autocomplete="email" class="hc-field">
                </div>
                <button type="submit" class="hc-btn hc-btn--primary hc-btn--block">Email me a sign-in link</button>
            </form>
        @endif
    </section>
@endsection
