import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { TicketListItem, TicketDetail, TicketMessage, TicketStatus, ContactOption, NewTicketInput, TicketCounts } from '../../lib/types';

function ticketsPath(filters: Record<string, string>, sort: string): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== '') params.set(`filter[${k}]`, v); });
    if (sort !== 'updated_at') params.set('sort', sort);
    const qs = params.toString();
    return `/tickets${qs ? `?${qs}` : ''}`;
}

function relNext(next: string | null): string | null {
    if (!next) return null;
    const u = new URL(next, window.location.origin);
    return u.pathname + u.search; // a /v1/... path the api client uses as-is
}

export function useTickets(filters: Record<string, string> = {}, sort: string = 'updated_at') {
    return useInfiniteQuery({
        queryKey: ['tickets', filters, sort],
        queryFn: ({ pageParam }) => api.page<TicketListItem>((pageParam as string | null) ?? ticketsPath(filters, sort)),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => relNext(last.next),
    });
}

export function useTicketCounts() {
    return useQuery({ queryKey: ['ticketCounts'], queryFn: () => api.get<TicketCounts>('/tickets/counts') });
}

export function useTicket(id: string) {
    return useQuery({ queryKey: ['ticket', id], queryFn: () => api.get<TicketDetail>(`/tickets/${id}`), enabled: !!id });
}

export function usePostTicketMessage(ticketId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { body: string; internal: boolean }) =>
            api.post<TicketMessage>(`/tickets/${ticketId}/messages`, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
            qc.invalidateQueries({ queryKey: ['tickets'] });
            qc.invalidateQueries({ queryKey: ['ticketCounts'] });
        },
    });
}

export function useChangeTicketStatus(ticketId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (status: TicketStatus) =>
            api.patch<TicketListItem>(`/tickets/${ticketId}`, { status }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
            qc.invalidateQueries({ queryKey: ['tickets'] });
            qc.invalidateQueries({ queryKey: ['ticketCounts'] });
        },
    });
}

export function useContacts() {
    return useQuery({ queryKey: ['contacts'], queryFn: () => api.get<ContactOption[]>('/contacts') });
}

export function useCreateTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: NewTicketInput) => api.post<TicketListItem>('/tickets', input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tickets'] });
            qc.invalidateQueries({ queryKey: ['ticketCounts'] });
        },
    });
}

export function useCreateContact() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; email: string; phone: string | null }) => api.post<ContactOption>('/contacts', input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
}
