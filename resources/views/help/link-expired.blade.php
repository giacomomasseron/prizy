@extends('help.layout')

@section('title', 'Link expired')

@section('content')
    <section class="wrap" style="max-width:440px;padding:64px 28px">
        <div class="card" style="padding:24px 22px">
            <h1 style="font-size:20px;font-weight:600;letter-spacing:-.02em;margin:0 0 8px">This link has expired</h1>
            <p class="muted" style="margin:0 0 16px">Sign-in links work once and expire after 15 minutes.</p>
            <a href="{{ route('help.login') }}" class="btn btn-primary" style="display:inline-flex">Request a new one</a>
        </div>
    </section>
@endsection
