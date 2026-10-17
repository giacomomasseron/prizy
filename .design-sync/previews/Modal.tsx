import { useState, type ReactNode } from 'react';
import { Button, Input, Modal, TeamTile } from '@prizy/ui';

/** A fixed-position overlay covers the viewport; the transform makes this box its viewport, so the card holds it. */
function Stage({ children, height }: { children: ReactNode; height: number }) {
    return <div style={{ position: 'relative', width: 680, height, transform: 'translateZ(0)' }}>{children}</div>;
}

const header = { padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' };
const title = { margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--fg)' };
const sub = { margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg2)' };
const body = { padding: '20px 22px', display: 'flex', flexDirection: 'column' as const, gap: 18 };
const footer = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' };
const label = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 };

const COLORS = ['#5b57e0', '#3a8f4d', '#3f74d6', '#d9623a', '#9b5bd6', '#c96b8f'];

export function CreateTeam() {
    const [color, setColor] = useState(COLORS[0]);
    return (
        <Stage height={520}>
        <Modal open onClose={() => {}} width={480} label="Create team">
            <div style={header}>
                <h2 style={title}>Create team</h2>
                <p style={sub}>Teams group issues, projects, and cycles.</p>
            </div>
            <div style={body}>
                <div>
                    <label htmlFor="team-name" style={label}>Team name</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <TeamTile identifier="ENG" color={color} size={40} />
                        <Input id="team-name" defaultValue="Engineering" />
                    </div>
                </div>
                <div>
                    <label htmlFor="team-id" style={label}>Identifier</label>
                    <Input id="team-id" defaultValue="ENG" maxLength={8} />
                </div>
                <div>
                    <div style={label}>Color</div>
                    <div role="group" aria-label="Colour" style={{ display: 'flex', gap: 9 }}>
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={`Color ${c}`}
                                aria-pressed={color === c}
                                onClick={() => setColor(c)}
                                style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${color === c ? 'var(--fg)' : 'var(--panel)'}`, boxShadow: `0 0 0 1.5px ${color === c ? 'var(--fg)' : 'var(--border)'}` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div style={footer}>
                <Button variant="secondary" size="sm">Cancel</Button>
                <Button size="sm">Create team</Button>
            </div>
        </Modal>
        </Stage>
    );
}

export function DeleteConfirm() {
    return (
        <Stage height={300}>
        <Modal open onClose={() => {}} width={420} label="Delete this message?">
            <div style={{ padding: 24 }}>
                <h2 style={title}>Delete this message?</h2>
                <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--fg2)', lineHeight: 1.5 }}>It is removed from the chat for everyone.</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
                    <Button variant="secondary" size="sm">Cancel</Button>
                    <Button variant="danger" size="sm">Delete</Button>
                </div>
            </div>
        </Modal>
        </Stage>
    );
}
