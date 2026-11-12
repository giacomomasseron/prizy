{{-- A round initials avatar. $tone: `me` (the signed-in contact), `agent` (support staff) or `none` (nobody yet:
     a dot). $size: sm (22px), md (30px) or lg (34px). Decorative: the name is always written beside it. --}}
@php
    $avatarParts = preg_split('/\s+/u', trim((string) ($name ?? '')), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $avatarInitials = mb_strtoupper(
        mb_substr($avatarParts[0] ?? '', 0, 1).(count($avatarParts) > 1 ? mb_substr($avatarParts[count($avatarParts) - 1], 0, 1) : '')
    );
@endphp
<span class="hc-avatar hc-avatar--{{ $tone ?? 'agent' }} hc-avatar--{{ $size ?? 'md' }}" aria-hidden="true">{{ $avatarInitials !== '' ? $avatarInitials : '·' }}</span>
