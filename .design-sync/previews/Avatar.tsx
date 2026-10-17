import { Avatar } from '@prizy/ui';

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar initials="MC" color="#6d69f2" size={20} title="Maya Chen" />
        <Avatar initials="MC" color="#6d69f2" size={26} title="Maya Chen" />
        <Avatar initials="MC" color="#6d69f2" size={32} title="Maya Chen" />
        <Avatar initials="MC" color="#6d69f2" size={40} title="Maya Chen" />
    </div>
);

export const People = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar initials="MC" color="#6d69f2" size={28} title="Maya Chen" />
        <Avatar initials="DO" color="#4bab66" size={28} title="Devin Ortiz" />
        <Avatar initials="GO" color="#f08c00" size={28} title="Grace Okonkwo" />
        <Avatar initials="AR" color="#e64980" size={28} title="Alex Rivera" />
        <Avatar initials="SK" color="#1c7ed6" size={28} title="Sam Kim" />
    </div>
);

export const Unassigned = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--fg2)' }}>
        <Avatar size={22} />
        Unassigned
    </div>
);

export const WithName = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
        <Avatar initials="GO" color="#f08c00" size={22} title="Grace Okonkwo" />
        Grace Okonkwo
    </div>
);
