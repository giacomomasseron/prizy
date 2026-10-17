import { AvatarStack } from '@prizy/ui';

export const Team = () => (
    <AvatarStack
        avatars={[
            { initials: 'MC', color: '#6d69f2', title: 'Maya Chen' },
            { initials: 'DO', color: '#4bab66', title: 'Devin Ortiz' },
            { initials: 'GO', color: '#f08c00', title: 'Grace Okonkwo' },
        ]}
    />
);

export const Overflow = () => (
    <AvatarStack
        size={28}
        max={4}
        avatars={[
            { initials: 'MC', color: '#6d69f2', title: 'Maya Chen' },
            { initials: 'DO', color: '#4bab66', title: 'Devin Ortiz' },
            { initials: 'GO', color: '#f08c00', title: 'Grace Okonkwo' },
            { initials: 'AR', color: '#e64980', title: 'Alex Rivera' },
            { initials: 'SK', color: '#1c7ed6', title: 'Sam Kim' },
            { initials: 'LB', color: '#9c36b5', title: 'Lena Brandt' },
            { initials: 'TN', color: '#f03e3e', title: 'Tomás Navarro' },
        ]}
    />
);

export const ProjectMembers = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--fg2)' }}>
        <AvatarStack
            size={22}
            avatars={[
                { initials: 'MC', color: '#6d69f2', title: 'Maya Chen' },
                { initials: 'AR', color: '#e64980', title: 'Alex Rivera' },
                {},
            ]}
        />
        3 members
    </div>
);
