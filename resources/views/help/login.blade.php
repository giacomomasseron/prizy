@extends('help.layout')

@section('title', 'Sign in')

@section('content')
    <section class="wrap" style="max-width:440px;padding:64px 28px">
        <h1 style="font-size:24px;font-weight:600;letter-spacing:-.02em;margin:0 0 8px">Sign in to view your requests</h1>
        @if ($sent)
            <div class="card" style="padding:18px 20px;margin-top:16px">
                <p style="margin:0" class="muted">{{ "If that address has requests with us, we've emailed a sign-in link. It expires in 15 minutes." }}</p>
            </div>
        @else
            <p class="muted" style="margin:0 0 22px">We'll email you a one-time link — no password needed.</p>
            <form method="POST" action="{{ route('help.login') }}" class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px">
                @csrf
                <label style="display:flex;flex-direction:column;gap:7px;font-size:12.5px;font-weight:500" class="muted">Email
                    <input type="email" name="email" required style="height:42px;border-radius:10px;border:1px solid var(--border2);background:var(--bg2);color:var(--fg);font-size:14px;padding:0 13px;outline:none">
                </label>
                <button type="submit" class="btn btn-primary" style="justify-content:center">Email me a sign-in link</button>
            </form>
        @endif
    </section>
@endsection
