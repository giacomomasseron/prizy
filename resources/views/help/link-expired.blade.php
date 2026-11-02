@extends('help.layout')

@section('title', 'Link expired')

@section('content')
    <section class="hc-wrap hc-wrap--solo hc-solo-page">
        <div class="hc-card hc-form">
            <h1 class="hc-title hc-title--sm">This link has expired</h1>
            <p class="hc-muted">Sign-in links work once and expire after 15 minutes.</p>
            <div><a href="{{ route('help.login') }}" class="hc-btn hc-btn--primary">Request a new one</a></div>
        </div>
    </section>
@endsection
