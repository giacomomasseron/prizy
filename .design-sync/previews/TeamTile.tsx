import { TeamTile } from '@prizy/ui';

export const Teams = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TeamTile identifier="ENG" color="#5b57e0" />
        <TeamTile identifier="SUP" color="#3a8f4d" />
        <TeamTile identifier="DES" color="#ffe46b" />
        <TeamTile identifier="OPS" color="#1d1a14" />
    </div>
);

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TeamTile identifier="ENG" color="#5b57e0" size={24} />
        <TeamTile identifier="ENG" color="#5b57e0" size={34} />
        <TeamTile identifier="ENG" color="#5b57e0" size={40} />
        <TeamTile identifier="ENG" color="#5b57e0" size={52} />
    </div>
);

export const TeamRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 340, padding: '10px 14px', background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-row)' }}>
        <TeamTile identifier="ENG" color="#5b57e0" />
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>Engineering</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>12 members · 48 open issues</div>
        </div>
    </div>
);
