// break-ui regression fixture: the longest names Kirana-B accepts (fullname and business name
// max 100; store name is unbounded), plus every optional field missing.
import {render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {expect, it, vi} from 'vitest';
import type {Me} from '../api/types';
import {AuthProvider} from '../auth/AuthContext';
import {NoPosAccess} from './NoPosAccess';
import {PosWorkspace} from './PosWorkspace';

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(() => new Promise(() => {}))}));

const BUSINESS =
    'Shree Siddhivinayak Kirana & General Stores, Opp. Gandhi Chowk Bus Stand, Ichalkaranji';
const STORE = 'Ground-floor billing counter near cold storage (Ichalkaranji Road branch, gate 2)';
const NAME = 'Venkatanarasimharajuvaripeta Subrahmanya Lakshminarayana Chakravarthy';

function worst(overrides: Partial<Me>): Me {
    return {
        user: {
            id: 'u1',
            username: 'venkat',
            email: 'venkat@example.com',
            fullname: NAME,
            phoneNumber: '9876543210',
            role: 'EMPLOYEE',
        },
        business: {id: 'k1', name: BUSINESS},
        store: {id: 's1', name: STORE},
        membershipRole: 'INVENTORY_MANAGER',
        permissions: ['pos.use'],
        ...overrides,
    };
}

const inShell = (ui: ReactNode) => render(<AuthProvider>{ui}</AuthProvider>);

it('keeps truncated header names readable through a tooltip', () => {
    inShell(<PosWorkspace me={worst({})} />);
    expect(screen.getByText(BUSINESS)).toHaveAttribute('title', BUSINESS);
    expect(screen.getByText(STORE)).toHaveAttribute('title', STORE);
    expect(screen.getByText(NAME)).toHaveAttribute('title', NAME);
    expect(screen.getByText('Inventory manager')).toBeInTheDocument();
});

it('leaves no empty line or placeholder when store and role are missing', () => {
    inShell(<PosWorkspace me={worst({store: null, membershipRole: null})} />);
    const bar = screen.getByRole('banner');
    expect(bar.querySelectorAll('.pos__meta')).toHaveLength(0);
    expect(bar).not.toHaveTextContent(/undefined|null|—/);
});

it('a platform account with no business still gets a clear way out', () => {
    inShell(<NoPosAccess me={worst({business: null, membershipRole: null, permissions: []})} />);
    expect(screen.getByText(`Signed in as ${NAME}`)).toBeInTheDocument();
    expect(screen.queryByText(/ at /)).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Log out'})).toBeInTheDocument();
});
