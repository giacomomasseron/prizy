import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { TicketListItem, TicketDetail } from '../../lib/types';

export function useTickets() {
    return useQuery({ queryKey: ['tickets'], queryFn: () => api.get<TicketListItem[]>('/tickets') });
}

export function useTicket(id: string) {
    return useQuery({ queryKey: ['ticket', id], queryFn: () => api.get<TicketDetail>(`/tickets/${id}`), enabled: !!id });
}
