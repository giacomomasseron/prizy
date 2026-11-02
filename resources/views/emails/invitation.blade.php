@extends('emails.layout')

@section('title', 'You’re invited to '.$workspaceName)
@section('preheader', $inviterName.' invited you to join '.$workspaceName.' on Prizy. The invitation expires in '.$expiresInHours.' hours.')
@section('badge', 'You’re invited')
@section('expiring', 'This invitation')
@section('steps-heading', 'Once you’re in')
@section('disclaimer', 'Weren’t expecting this invitation? No action is required — it will simply expire.')

@section('headline')
Come build with<br>the <span style="background-color:#ffd84a;padding:0 6px;border-radius:6px;">team</span>.
@endsection

@section('intro')
<strong style="color:#1d1a14;">{{ $inviterName }}</strong> invited you to join their workspace on Prizy &mdash; {{ $pitch }}
@endsection
