{{-- Plain text, so {!! !!}: there is no HTML here to escape for. --}}
Come build with the team.

{!! $inviterName !!} invited you to join their workspace on Prizy - {!! $pitch !!}

Your workspace: {!! $workspaceName !!} ({{ $workspaceHost }})

{!! $actionText !!}:
{!! $actionUrl !!}

This invitation expires in {{ $expiresInHours }} hours.

Once you're in
@include('emails.text-closing')

Weren't expecting this invitation? No action is required - it will simply expire.
