const stack: string[] = [];
export function pushOverlay(id: string): void { stack.push(id); }
export function popOverlay(id: string): void {
    const i = stack.lastIndexOf(id);
    if (i !== -1) stack.splice(i, 1);
}
export function isTopmost(id: string): boolean { return stack.length > 0 && stack[stack.length - 1] === id; }
