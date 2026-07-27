import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { TicketListItem, TicketDetail, TicketMessage, TicketStatus, ContactOption, NewTicketInput } from '../../lib/types';

export function useTickets() {
    return useQuery({ queryKey: ['tickets'], queryFn: () => api.get<TicketListItem[]>('/tickets') });
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
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
    });
}
