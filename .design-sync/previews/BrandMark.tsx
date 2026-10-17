import { BrandMark } from '@prizy/ui';

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BrandMark size={22} />
        <BrandMark />
        <BrandMark size={40} />
        <BrandMark size={56} />
    </div>
);

export const Lockup = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrandMark size={32} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.03em', color: 'var(--fg)' }}>Prizy</span>
    </div>
);
