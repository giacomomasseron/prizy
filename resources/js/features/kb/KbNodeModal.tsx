import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import { useCreateKbCategory, useCreateKbSection, useUpdateKbCategory, useUpdateKbSection } from './hooks';
import { slugify } from './kbUtils';
import { KB_COLORS, KB_ICONS, KB_RESERVED } from './types';
import type { KbCategoryNode, KbSectionNode } from './types';
import type { TreeNode } from './KbTree';

export type NodeModalState =
    | { kind: 'category'; category?: KbCategoryNode }
    | { kind: 'section'; categoryId: string; section?: KbSectionNode };

export interface KbNodeModalProps {
    state: NodeModalState | null;
    categories: KbCategoryNode[];
    onClose(): void;
    onCreated(node: TreeNode): void;
}

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 };
const RESERVED_TEXT = `${KB_RESERVED.slice(0, -1).join(', ')} and ${KB_RESERVED[KB_RESERVED.length - 1]} are reserved.`;

export function KbNodeModal({ state, categories, onClose, onCreated }: KbNodeModalProps) {
    const open = state !== null;
    const isCategory = state?.kind === 'category';
    const category = state?.kind === 'category' ? state.category : undefined;
    const section = state?.kind === 'section' ? state.section : undefined;
    const categoryId = state?.kind === 'section' ? state.categoryId : undefined;
    const entity = category ?? section;
    const isEditing = !!entity;

    const createCategory = useCreateKbCategory();
    const updateCategory = useUpdateKbCategory();
    const createSection = useCreateKbSection();
    const updateSection = useUpdateKbSection();
    const pending = createCategory.isPending || updateCategory.isPending || createSection.isPending || updateSection.isPending;

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [icon, setIcon] = useState<string>(KB_ICONS[0]);
    const [color, setColor] = useState<string>(KB_COLORS[0]);
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(entity?.name ?? '');
        setSlug(entity?.slug ?? '');
        setSlugTouched(!!entity);
        setIcon(category?.icon ?? KB_ICONS[0]);
        setColor(category?.color ?? KB_COLORS[0]);
        setDescription(category?.description ?? '');
        setError(null);
        // Re-run only when the modal opens or the entity being edited changes (not on every parent re-render).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entity?.id]);

    useEffect(() => {
        if (!slugTouched) setSlug(slugify(name));
    }, [name, slugTouched]);

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    const slugError = useMemo(() => {
        if (!trimmedSlug) return 'A slug is required — it becomes part of the URL.';
        if (isCategory && (KB_RESERVED as readonly string[]).includes(trimmedSlug)) return RESERVED_TEXT;
        const siblings: { id: string; slug: string }[] = isCategory
            ? categories
            : categories.find((c) => c.id === categoryId)?.sections ?? [];
        const dup = siblings.some((sib) => sib.slug === trimmedSlug && sib.id !== entity?.id);
        if (dup) return isCategory ? 'Already used by another category.' : 'Already used by another section.';
        return null;
    }, [trimmedSlug, isCategory, categories, categoryId, entity?.id]);

    const canSubmit = trimmedName !== '' && !slugError && !pending;

    async function submit() {
        if (!canSubmit) return;
        setError(null);
        try {
            if (isCategory) {
                const payload = { name: trimmedName, slug: trimmedSlug, icon, color, description: description.trim() || null };
                if (category) {
                    await updateCategory.mutateAsync({ id: category.id, ...payload });
                    onClose();
                } else {
                    const created = await createCategory.mutateAsync(payload);
                    onClose();
                    onCreated({ kind: 'category', id: created.id });
                }
            } else if (categoryId) {
                const payload = { name: trimmedName, slug: trimmedSlug };
                if (section) {
                    await updateSection.mutateAsync({ id: section.id, ...payload });
                    onClose();
                } else {
                    const created = await createSection.mutateAsync({ ...payload, category_id: categoryId });
                    onClose();
                    onCreated({ kind: 'section', id: created.id, categoryId });
                }
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.errors?.slug?.[0] ?? err.detail);
            } else {
                setError(`Failed to ${isEditing ? 'update' : 'create'} ${isCategory ? 'category' : 'section'}.`);
            }
        }
    }

    if (!state) return null;

    const title = isCategory ? (isEditing ? 'Edit category' : 'New category') : (isEditing ? 'Edit section' : 'New section');
    const subtitle = isCategory ? 'A top-level topic on the help center.' : 'Sections group articles inside a category.';
    const footnote = isCategory ? 'Position: last in the library' : 'Position: last in the category';

    return (
        <Modal open={open} onClose={onClose} width={520} label={title}>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
                    <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 3 }}>{subtitle}</div>
                </div>

                <div>
                    <label htmlFor="kb-node-name" style={fieldLabel}>Name</label>
                    <Input
                        id="kb-node-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isCategory ? 'e.g. Accounts & SSO' : 'e.g. Troubleshooting'}
                    />
                </div>

                <div>
                    <label htmlFor="kb-node-slug" style={fieldLabel}>Slug</label>
                    <Input id="kb-node-slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} placeholder="slug" />
                    {slugError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{slugError}</div>}
                </div>

                {isCategory && (
                    <>
                        <div>
                            <div style={fieldLabel}>Icon</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {KB_ICONS.map((glyph) => (
                                    <button
                                        key={glyph}
                                        type="button"
                                        aria-label={glyph}
                                        aria-pressed={icon === glyph}
                                        onClick={() => setIcon(glyph)}
                                        style={{
                                            width: 34, height: 34, borderRadius: 9, fontSize: 15, fontFamily: 'inherit',
                                            border: icon === glyph ? '2px solid var(--fg)' : '1px solid var(--border)',
                                            background: 'var(--panel)', color: 'var(--fg)', cursor: 'pointer',
                                        }}
                                    >
                                        {glyph}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={fieldLabel}>Colour</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {KB_COLORS.map((hex) => (
                                    <button
                                        key={hex}
                                        type="button"
                                        aria-label={hex}
                                        aria-pressed={color === hex}
                                        onClick={() => setColor(hex)}
                                        style={{
                                            width: 26, height: 26, borderRadius: '50%', background: hex, cursor: 'pointer',
                                            border: color === hex ? '2px solid var(--fg)' : '2px solid transparent',
                                            boxShadow: color === hex ? '0 0 0 1px var(--border2)' : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="kb-node-description" style={fieldLabel}>Description</label>
                            <Textarea
                                id="kb-node-description"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="One line shown under the topic on the help center."
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg2)' }}>
                            <span style={{ fontSize: 18, color }}>{icon}</span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{name.trim() || 'Category name'}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{description.trim() || 'Description shown under the topic card'}</div>
                            </div>
                        </div>
                    </>
                )}

                {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--fg3)', flex: 1 }}>{footnote}</span>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={!canSubmit}>{isEditing ? 'Save' : 'Create'}</Button>
                </div>
            </div>
        </Modal>
    );
}
