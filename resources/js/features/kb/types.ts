export type KbStatus = 'draft' | 'published' | 'archived';
export interface KbAuthor { id: string; name: string }
export interface KbArticleSummary {
    id: string; title: string; slug: string; status: KbStatus; position: number; author: KbAuthor;
    views_count: number; helpful_count: number; unhelpful_count: number;
    published_at: string | null; updated_at: string; created_at: string; public_url: string | null;
}
export interface KbSectionNode { id: string; category_id: string; name: string; slug: string; position: number; articles: KbArticleSummary[] }
export interface KbCategoryNode { id: string; name: string; slug: string; icon: string; color: string; description: string | null; position: number; sections: KbSectionNode[] }
export interface KbLibrary { categories: KbCategoryNode[] }
export interface KbArticleEdit extends KbArticleSummary {
    body: string; section_id: string;
    section: { id: string; name: string; slug: string };
    category: { id: string; name: string; slug: string };
}
export const KB_COLORS = ['#3aa76d', '#6d69f2', '#5b8def', '#b06ae0', '#e0a13a', '#eb5757', '#4bab66', '#8b8b95'] as const;
export const KB_ICONS = ['◇', '◷', '◫', '⚿', '⌗', '{ }', '☺', '◔', '▤', '✦', '☂', '⎈'] as const;
export const KB_RESERVED = ['search', 'articles', 'requests', 'new', 'login'] as const;
