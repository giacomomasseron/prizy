/** The greeting for a local hour (the Today v2 design): Morning before noon, Afternoon before six, then Evening. */
export function greetingFor(hour: number): string {
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
}

/** The first word of a name: "Alex Rivera" → "Alex". */
export function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? '';
}

/** The Today page's date line: "Friday, October 10". */
export function todayLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
