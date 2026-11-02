import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Menu } from '../../components/ui/Menu';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Button } from '../../components/ui/Button';
import { TOOL_PILL_CLASSES, toolPillStyle } from '../issues/issueStyles';
import { fieldLabel, modalBody, modalFooter, modalHeader, modalTitle } from '../settings/settingsStyles';
import { useContacts, useCreateTicket, useCreateContact } from './hooks';
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


export function NewTicketModal({ open, onClose }: { open: boolean; onClose(): void }) {
    const navigate = useNavigate();
    const contactsQ = useContacts();
    const create = useCreateTicket();
    const createContact = useCreateContact();
    const [showNewContact, setShowNewContact] = useState(false);
    const [ncName, setNcName] = useState('');
    const [ncEmail, setNcEmail] = useState('');
    const [ncPhone, setNcPhone] = useState('');
    const [contactError, setContactError] = useState<string | null>(null);

    const [subject, setSubject] = useState('');
    const [requesterId, setRequesterId] = useState<string | null>(null);
    const [priority, setPriority] = useState<TicketPriority>('normal');
    const [channel, setChannel] = useState<TicketChannel>('email');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setSubject(''); setRequesterId(null); setPriority('normal'); setChannel('email'); setBody(''); setError(null);
            setShowNewContact(false); setNcName(''); setNcEmail(''); setNcPhone(''); setContactError(null);
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

    function saveContact() {
        setContactError(null);
        createContact.mutate(
            { name: ncName.trim(), email: ncEmail.trim(), phone: ncPhone.trim() || null },
            {
                onSuccess: (c) => { setRequesterId(c.id); setShowNewContact(false); setNcName(''); setNcEmail(''); setNcPhone(''); },
                onError: (e) => setContactError(e instanceof ApiError ? e.detail : 'Could not create the contact.'),
            },
        );
    }

    return (
        <Modal open={open} onClose={onClose} width={520} label="New ticket">
            <div style={modalHeader}>
                <h2 style={modalTitle}>New ticket</h2>
            </div>

            <div style={modalBody}>
                <div>
                    <label htmlFor="new-ticket-subject" style={fieldLabel}>Subject</label>
                    <Input id="new-ticket-subject" autoFocus placeholder="Brief summary of the request" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>

                <div>
                    <span style={fieldLabel}>Requester</span>
                    {!showNewContact ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {contacts.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'var(--fg3)' }}>No contacts yet.</div>
                            ) : (
                                <Menu
                                    placement="bottom-start"
                                    fullWidth
                                    trigger={
                                        // The text colour (chosen vs placeholder) never changes on hover, so it may be inline.
                                        <button type="button" aria-label="Requester" className={TOOL_PILL_CLASSES} style={{ ...toolPillStyle, width: '100%', justifyContent: 'space-between', color: requester ? 'var(--fg)' : 'var(--fg3)' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{requester ? label(requester) : 'Select a contact…'}</span>
                                        </button>
                                    }
                                    items={contacts.map((c) => ({ key: c.id, label: label(c), onActivate: () => setRequesterId(c.id) }))}
                                />
                            )}
                            <button type="button" onClick={() => { setShowNewContact(true); setContactError(null); }} className="text-fg2 hover:text-fg" style={{ alignSelf: 'flex-start', padding: 0, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>+ New contact</button>
                        </div>
                    ) : (
                        <div data-testid="new-contact-box" style={{ display: 'flex', flexDirection: 'column', gap: 8, border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-row)', padding: 12 }}>
                            <Input aria-label="Contact name" placeholder="Name" value={ncName} onChange={(e) => setNcName(e.target.value)} />
                            <Input aria-label="Contact email" placeholder="Email" value={ncEmail} onChange={(e) => setNcEmail(e.target.value)} />
                            <Input aria-label="Contact phone" placeholder="Phone (optional)" value={ncPhone} onChange={(e) => setNcPhone(e.target.value)} />
                            {contactError && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12 }}>{contactError}</div>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="sm" aria-label="Create contact" disabled={createContact.isPending || ncName.trim() === '' || ncEmail.trim() === ''} onClick={saveContact}>Create contact</Button>
                                <Button variant="secondary" size="sm" onClick={() => setShowNewContact(false)}>Cancel</Button>
                            </div>
                        </div>
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

                {error && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12.5 }}>{error}</div>}
            </div>

            <div style={modalFooter}>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={submit} disabled={!canCreate} aria-label="Create ticket">Create ticket</Button>
            </div>
        </Modal>
    );
}
