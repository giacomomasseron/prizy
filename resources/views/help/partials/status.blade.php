{{-- A request's status pill: the customer label, coloured like the agent desk — one colour per label. --}}
<span class="hc-status hc-status--{{ \App\Repositories\PortalTicketRepository::STATUS_TONES[$status] ?? 'none' }}">{{ \App\Repositories\PortalTicketRepository::STATUS_LABELS[$status] ?? ucfirst($status) }}</span>
