import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { KbArticleEdit, KbCategoryNode, KbLibrary, KbSectionNode, KbStatus, KbVersionDetail, KbVersionSummary } from './types';

export const KB_KEY = ['kb'] as const;
export function useKbLibrary() { return useQuery({ queryKey: [...KB_KEY, 'library'], queryFn: () => api.get<KbLibrary>('/kb/library') }); }
export function useKbArticle(id: string | undefined) {
    return useQuery({ queryKey: [...KB_KEY, 'article', id], queryFn: () => api.get<KbArticleEdit>(`/kb/articles/${id}`), enabled: !!id });
}
function useKbMutation<TVars, TData = unknown>(fn: (v: TVars) => Promise<TData>) {
    const qc = useQueryClient();
    return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KB_KEY }) });
}
export interface CategoryPayload { name: string; slug: string; icon: string; color: string; description: string | null }
export interface SectionPayload { name: string; slug: string }
export const useCreateKbCategory = () => useKbMutation((p: CategoryPayload) => api.post<KbCategoryNode>('/kb/categories', p));
export const useUpdateKbCategory = () => useKbMutation(({ id, ...p }: CategoryPayload & { id: string }) => api.patch<KbCategoryNode>(`/kb/categories/${id}`, p));
export const useDeleteKbCategory = () => useKbMutation((id: string) => api.del(`/kb/categories/${id}`));
export const useMoveKbCategory = () => useKbMutation(({ id, direction }: { id: string; direction: 'up' | 'down' }) => api.post(`/kb/categories/${id}/move`, { direction }));
export const useArchiveKbCategoryArticles = () => useKbMutation((id: string) => api.post<{ archived: number }>(`/kb/categories/${id}/archive-articles`));
export const useCreateKbSection = () => useKbMutation((p: SectionPayload & { category_id: string }) => api.post<KbSectionNode>('/kb/sections', p));
export const useUpdateKbSection = () => useKbMutation(({ id, ...p }: SectionPayload & { id: string }) => api.patch<KbSectionNode>(`/kb/sections/${id}`, p));
export const useDeleteKbSection = () => useKbMutation((id: string) => api.del(`/kb/sections/${id}`));
export const useMoveKbSection = () => useKbMutation(({ id, direction }: { id: string; direction: 'up' | 'down' }) => api.post(`/kb/sections/${id}/move`, { direction }));
export const useArchiveKbSectionArticles = () => useKbMutation((id: string) => api.post<{ archived: number }>(`/kb/sections/${id}/archive-articles`));
export interface ArticlePayload { section_id: string; title: string; slug: string; body: string }
export const useCreateKbArticle = () => useKbMutation((p: ArticlePayload) => api.post<KbArticleEdit>('/kb/articles', p));
export const useUpdateKbArticle = () => useKbMutation(({ id, ...p }: Partial<ArticlePayload> & { id: string }) => api.patch<KbArticleEdit>(`/kb/articles/${id}`, p));
export const useDeleteKbArticle = () => useKbMutation((id: string) => api.del(`/kb/articles/${id}`));
export const useMoveKbArticle = () => useKbMutation(({ id, direction }: { id: string; direction: 'up' | 'down' }) => api.post(`/kb/articles/${id}/move`, { direction }));
export const useChangeKbArticleStatus = () => useKbMutation(({ id, status }: { id: string; status: KbStatus }) => api.post<KbArticleEdit>(`/kb/articles/${id}/status`, { status }));
export function usePreviewKbMarkdown() { return useMutation({ mutationFn: (body: string) => api.post<{ html: string }>('/kb/preview', { body }) }); }
export function useKbArticleVersions(articleId: string | undefined) {
    return useQuery({
        queryKey: [...KB_KEY, 'versions', articleId],
        queryFn: () => api.get<KbVersionSummary[]>(`/kb/articles/${articleId}/versions`),
        enabled: !!articleId,
    });
}
export function useKbArticleVersion(articleId: string | undefined, versionId: string | null) {
    return useQuery({
        queryKey: [...KB_KEY, 'versions', articleId, versionId],
        queryFn: () => api.get<KbVersionDetail>(`/kb/articles/${articleId}/versions/${versionId}`),
        enabled: !!articleId && !!versionId,
    });
}
export const useRestoreKbArticleVersion = () => useKbMutation(
    ({ articleId, versionId }: { articleId: string; versionId: string }) =>
        api.post<KbArticleEdit>(`/kb/articles/${articleId}/versions/${versionId}/restore`),
);
