{{-- Plain text, so {!! !!}: an escaped & would break the link. --}}
Welcome aboard. Let's confirm it's you.

Your Prizy workspace is set up and waiting. Verify your email address and we'll take you straight in.

Your workspace: {!! $workspaceName !!} ({{ $workspaceHost }})

{!! $actionText !!}:
{!! $actionUrl !!}

This link expires in {{ $expiresInHours }} hours.

What happens next
@include('emails.text-closing')

Didn't create a Prizy workspace? You can safely ignore this email.
