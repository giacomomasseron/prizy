import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { api, nextPath } from '../../lib/apiClient';
import type { IssueLookupItem, Project, ProjectMessage } from '../../lib/types';

/** One page of a project's chat as GET /v1/projects/{id}/messages answers it: newest first. */
export interface MessagePage {
    items: ProjectMessage[];
    next: string | null;
}

export type MessagePages = InfiniteData<MessagePage, string | null>;

/** The chat's cache key, under the project's own. */
export function messagesKey(projectId: string) {
    return ['project', projectId, 'messages'] as const;
}

/** A project's chat (PRD §3.2.11): the latest 50 messages, then older pages on demand. */
export function useProjectMessages(projectId: string) {
    return useInfiniteQuery<MessagePage, Error, MessagePages, ReturnType<typeof messagesKey>, string | null>({
        queryKey: messagesKey(projectId),
        queryFn: ({ pageParam }) => api.page<ProjectMessage>(pageParam ?? `/projects/${projectId}/messages`),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => nextPath(last.next),
        enabled: !!projectId,
    });
}

/** Every loaded message, oldest first: the order the chat shows them in. */
export function chronological(data: MessagePages | undefined): ProjectMessage[] {
    return (data?.pages ?? []).flatMap((p) => p.items).reverse();
}

function hasMessage(data: MessagePages | undefined, id: string): boolean {
    return !!data?.pages.some((p) => p.items.some((m) => m.id === id));
}

function replaced(data: MessagePages, message: ProjectMessage): MessagePages {
    return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === message.id ? message : m)) })) };
}

function adjustCount(qc: QueryClient, projectId: string, by: number): void {
    qc.setQueryData<Project>(['project', projectId], (p) =>
        p && p.messages_count !== undefined ? { ...p, messages_count: Math.max(0, p.messages_count + by) } : p);
}

/**
 * A message has arrived, from your own post or from the channel. It joins the newest end once however often it
 * arrives, and the project's count goes up only when it is new. With no chat in the cache, the project is refetched.
 */
export function receiveMessage(qc: QueryClient, projectId: string, message: ProjectMessage): void {
    const data = qc.getQueryData<MessagePages>(messagesKey(projectId));
    const [first, ...rest] = data?.pages ?? [];
    if (!data || !first) {
        void qc.invalidateQueries({ queryKey: ['project', projectId] });
        return;
    }
    if (hasMessage(data, message.id)) {
        qc.setQueryData<MessagePages>(messagesKey(projectId), replaced(data, message));
        return;
    }
    qc.setQueryData<MessagePages>(messagesKey(projectId), { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] });
    adjustCount(qc, projectId, 1);
}

/** A message was edited: it changes where it is loaded. One that isn't loaded stays out. */
export function receiveEdit(qc: QueryClient, projectId: string, message: ProjectMessage): void {
    qc.setQueryData<MessagePages>(messagesKey(projectId), (data) => (data ? replaced(data, message) : data));
}

/** A message is gone: out of the chat, and one off the count. If it wasn't loaded, the project is refetched for it. */
export function receiveDeletion(qc: QueryClient, projectId: string, id: string): void {
    const data = qc.getQueryData<MessagePages>(messagesKey(projectId));
    if (!data || !hasMessage(data, id)) {
        void qc.invalidateQueries({ queryKey: ['project', projectId], exact: true });
        return;
    }
    qc.setQueryData<MessagePages>(messagesKey(projectId), {
        ...data,
        pages: data.pages.map((p) => ({ ...p, items: p.items.filter((m) => m.id !== id) })),
    });
    adjustCount(qc, projectId, -1);
}

/** What a write sends: the text, and the picked issues it links (the server takes their ids). */
export interface MessageDraft {
    body: string;
    issues: IssueLookupItem[];
}

/**
 * Post a message. It shows once the server has it, from the answer or the channel, whichever comes first. A failure is
 * reported here with what was sent, not by mutate's own callbacks: TanStack drops those when a newer post supersedes
 * the call.
 */
export function usePostMessage(projectId: string, onFailed?: (draft: MessageDraft) => void) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (draft: MessageDraft) =>
            api.post<ProjectMessage>(`/projects/${projectId}/messages`, { body: draft.body, issue_ids: draft.issues.map((i) => i.id) }),
        onSuccess: (message) => receiveMessage(qc, projectId, message),
        onError: (_err, draft) => onFailed?.(draft),
    });
}

/** Edit one of your messages: new text and links. */
export function useEditMessage(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body, issues }: MessageDraft & { id: string }) =>
            api.patch<ProjectMessage>(`/projects/${projectId}/messages/${id}`, { body, issue_ids: issues.map((i) => i.id) }),
        onSuccess: (message) => receiveEdit(qc, projectId, message),
    });
}

/** Delete one of your messages. */
export function useDeleteMessage(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/projects/${projectId}/messages/${id}`),
        onSuccess: (_answer, id) => receiveDeletion(qc, projectId, id),
    });
}
