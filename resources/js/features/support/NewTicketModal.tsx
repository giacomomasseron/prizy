import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Menu } from '../../components/ui/Menu';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useContacts, useCreateTicket } from './hooks';
import { ApiError } from '../../lib/apiClient';
import type { TicketPriority, TicketChannel } from '../../lib/types';

const PRIORITY_OPTIONS: { label: string; value: TicketPriority }[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
];

const CHANNEL_OPTIONS: { label: string; value: TicketChannel }[] = [
    { label: 'Email', value: 'email' },
    { label: 'Chat', value: 'chat' },
    { label: 'Portal', value: 'portal' },
    { label: 'API', value: 'api' },
];

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 };
const pickerTrigger: CSSProperties = { width: '100%', textAlign: 'left', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit' };

export function NewTicketModal({ open, onClose }: { open: boolean; onClose(): void }) {
    const navigate = useNavigate();
    const contactsQ = useContacts();
    const create = useCreateTicket();

    const [subject, setSubject] = useState('');
    const [requesterId, setRequesterId] = useState<string | null>(null);
    const [priority, setPriority] = useState<TicketPriority>('normal');
    const [channel, setChannel] = useState<TicketChannel>('email');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setSubject(''); setRequesterId(null); setPriority('normal'); setChannel('email'); setBody(''); setError(null);
        }
    }, [open]);

    const contacts = contactsQ.data ?? [];
    const requester = contacts.find((c) => c.id === requesterId) ?? null;
    const label = (c: { name: string; org: string | null }) => (c.org ? `${c.name} · ${c.org}` : c.name);
    const canCreate = subject.trim() !== '' && !!requesterId && body.trim() !== '' && !create.isPending;

    function submit() {
        if (!requesterId || !canCreate) return;
        setError(null);
        create.mutate(
            { subject: subject.trim(), requester_id: requesterId, priority, channel, body: body.trim() },
            {
                onSuccess: (ticket) => { onClose(); navigate(`/support/tickets/${ticket.id}`); },
                onError: (e) => setError(e instanceof ApiError ? e.detail : 'Could not create the ticket. Please try again.'),
            },
        );
    }

    return (
        <Modal open={open} onClose={onClose} width={520} label="New ticket">
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>New ticket</h2>

                <div>
                    <label htmlFor="new-ticket-subject" style={fieldLabel}>Subject</label>
                    <Input id="new-ticket-subject" autoFocus placeholder="Brief summary of the request" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>

                <div>
                    <span style={fieldLabel}>Requester</span>
                    {contacts.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>No contacts yet.</div>
                    ) : (
                        <Menu
                            placement="bottom-start"
                            trigger={
                                <button type="button" aria-label="Requester" style={{ ...pickerTrigger, color: requester ? 'var(--fg)' : 'var(--fg3)' }}>
                                    {requester ? label(requester) : 'Select a contact…'}
                                </button>
                            }
                            items={contacts.map((c) => ({ key: c.id, label: label(c), onActivate: () => setRequesterId(c.id) }))}
                        />
                    )}
                </div>

                <div>
                    <span style={fieldLabel}>Priority</span>
                    <SegmentedControl<TicketPriority> options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
                </div>

                <div>
                    <span style={fieldLabel}>Channel</span>
                    <SegmentedControl<TicketChannel> options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
                </div>

                <div>
                    <label htmlFor="new-ticket-body" style={fieldLabel}>Description</label>
                    <Textarea id="new-ticket-body" rows={4} placeholder="What is the customer reporting?" value={body} onChange={(e) => setBody(e.target.value)} />
                </div>

                {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={onClose} style={{ border: '1px solid var(--border)', color: 'var(--fg2)', background: 'transparent', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canCreate}
                        aria-label="Create ticket"
                        style={{ background: 'var(--sup)', color: '#fff', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed', opacity: canCreate ? 1 : 0.5, fontFamily: 'inherit' }}
                    >
                        Create ticket
                    </button>
                </div>
            </div>
        </Modal>
    );
}
