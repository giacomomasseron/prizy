@extends('emails.layout')

@section('title', 'Verify your email')
@section('preheader', 'One click and your Prizy workspace '.$workspaceHost.' is ready. The link expires in '.$expiresInHours.' hours.')
@section('badge', 'Step 1 of 1 · Verify')
@section('expiring', 'This link')
@section('steps-heading', 'What happens next')
@section('disclaimer', 'Didn’t create a Prizy workspace? You can safely ignore this email.')

@section('headline')
Welcome aboard.<br>Let&rsquo;s confirm it&rsquo;s <span style="background-color:#ffd84a;padding:0 6px;border-radius:6px;">you</span>.
@endsection

@section('intro')
Your Prizy workspace is set up and waiting. Verify your email address and we&rsquo;ll take you straight in.
@endsection
