const AVATAR_COLORS = ['#6d69f2', '#4bab66', '#f08c00', '#e64980', '#1c7ed6', '#9c36b5', '#f03e3e'];

export function avatarFor(user: { id: string; name: string } | null | undefined): { initials: string; color: string | undefined } {
    if (!user) return { initials: '', color: undefined };
    const parts = user.name.trim().split(/\s+/);
    const initials = (parts.length >= 2
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].slice(0, 2)
    ).toUpperCase();
    let hash = 0;
    for (let i = 0; i < user.id.length; i++) hash = (hash * 31 + user.id.charCodeAt(i)) >>> 0;
    return { initials, color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}
