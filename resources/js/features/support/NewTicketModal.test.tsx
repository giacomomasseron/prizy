import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewTicketModal } from './NewTicketModal';
import { ApiError } from '../../lib/apiClient';
import type { ContactOption } from '../../lib/types';

const navigate = vi.fn();
const createMutate = vi.fn();
const createContactMutate = vi.fn();
let contactsData: ContactOption[] = [];

vi.mock('react-router-dom', async (orig) => {
    const actual = await orig<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => navigate };
});

vi.mock('./hooks', () => ({
    useContacts: () => ({ data: contactsData }),
    useCreateTicket: () => ({ mutate: createMutate, isPending: false }),
    useCreateContact: () => ({ mutate: createContactMutate, isPending: false }),
}));

function renderModal() {
    return render(
        <MemoryRouter>
            <NewTicketModal open onClose={vi.fn()} />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    navigate.mockReset();
    createMutate.mockReset();
    createContactMutate.mockReset();
    contactsData = [
        { id: 'c1', name: 'Grace Okonkwo', email: 'grace@northwind.com', org: 'Northwind Traders', plan: 'Enterprise' },
    ];
});

describe('NewTicketModal', () => {
    it('lists contacts in the requester picker', () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Requester' }));
        expect(screen.getByRole('menuitem', { name: 'Grace Okonkwo · Northwind Traders' })).toBeInTheDocument();
    });

    it('shows an empty state when there are no contacts', () => {
        contactsData = [];
        renderModal();
        expect(screen.getByText('No contacts yet.')).toBeInTheDocument();
    });

    it('keeps Create disabled until subject, requester, and description are set', () => {
        renderModal();
        const create = screen.getByRole('button', { name: 'Create ticket' });
        expect(create).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Login broken' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Cannot sign in' } });
        expect(create).toBeDisabled(); // requester still missing
        fireEvent.click(screen.getByRole('button', { name: 'Requester' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Grace Okonkwo · Northwind Traders' }));
        expect(create).toBeEnabled();
    });

    it('submits the create payload', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Login broken' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Cannot sign in' } });
        fireEvent.click(screen.getByRole('button', { name: 'Requester' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Grace Okonkwo · Northwind Traders' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }));
        expect(createMutate).toHaveBeenCalledWith(
            { subject: 'Login broken', requester_id: 'c1', priority: 'normal', channel: 'email', body: 'Cannot sign in' },
            expect.anything(),
        );
    });

    it('shows an error banner when creation fails', () => {
        createMutate.mockImplementation((_input, opts) => opts.onError(new ApiError(422, 'Unprocessable', 'Requester is invalid')));
        renderModal();
        fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'X' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Y' } });
        fireEvent.click(screen.getByRole('button', { name: 'Requester' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Grace Okonkwo · Northwind Traders' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Requester is invalid');
    });

    it('creates a new contact inline and selects it as the requester', () => {
        contactsData = [];
        createContactMutate.mockImplementation((input, opts) => {
            const newContact: ContactOption = { id: 'new-1', name: 'New Person', email: input.email, org: null, plan: null };
            contactsData = [...contactsData, newContact];
            opts.onSuccess(newContact);
        });
        renderModal();
        expect(screen.getByText('No contacts yet.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '+ New contact' }));
        fireEvent.change(screen.getByLabelText('Contact name'), { target: { value: 'New Person' } });
        fireEvent.change(screen.getByLabelText('Contact email'), { target: { value: 'new@person.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create contact' }));

        expect(createContactMutate).toHaveBeenCalledWith(
            { name: 'New Person', email: 'new@person.com', phone: null },
            expect.anything(),
        );
        expect(screen.getByRole('button', { name: 'Requester' })).toHaveTextContent('New Person');
    });

    it('surfaces an ApiError inline when contact creation fails', () => {
        createContactMutate.mockImplementation((_input, opts) => opts.onError(new ApiError(422, 'Unprocessable', 'Email already in use')));
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: '+ New contact' }));
        fireEvent.change(screen.getByLabelText('Contact name'), { target: { value: 'Dup Person' } });
        fireEvent.change(screen.getByLabelText('Contact email'), { target: { value: 'dup@person.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create contact' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Email already in use');
    });
});
