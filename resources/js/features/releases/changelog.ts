export function buildChangelog(name: string, issues: { ref: string; title: string; status: string }[]): string {
    const done = issues.filter((i) => i.status === 'done');
    return [`## ${name}`, ...done.map((i) => `- ${i.title} (#${i.ref})`)].join('\n');
}
