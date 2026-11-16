import {invoke} from '@tauri-apps/api/core';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from './App';
import type {Me} from './api/types';
import {AuthProvider} from './auth/AuthContext';
import {I18nProvider} from './i18n';

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn()}));
const invokeMock = vi.mocked(invoke);

function me(permissions: string[], role: Me['membershipRole'] = 'CASHIER'): Me {
    return {
        user: {
            id: 'u1',
            username: 'ravi',
            email: 'ravi@example.com',
            fullname: 'Ravi Kumar',
            phoneNumber: '9876543210',
            role: 'EMPLOYEE',
        },
        business: {id: 'k1', name: 'Sharma Kirana'},
        store: {id: 's1', name: 'Main counter'},
        membershipRole: role,
        permissions,
    };
}

/** A Rust command reply: HTTP status plus Kirana-B's envelope (tokens are never in it). */
function reply(status: number, data?: unknown, extra: object = {}) {
    const ok = status >= 200 && status < 300;
    return {
        status,
        body: {statusCode: status, status: ok, message: ok ? 'OK' : 'Nope', data, ...extra},
    };
}

type Handlers = Record<string, (args: Record<string, unknown>) => unknown>;

function bridge(handlers: Handlers) {
    invokeMock.mockImplementation(async (command, args) => {
        const handler = handlers[command];
        if (!handler) throw new Error(`unexpected command ${command}`);
        return handler((args ?? {}) as Record<string, unknown>);
    });
}

function renderApp() {
    render(
        <I18nProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </I18nProvider>,
    );
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText('Username or email'), 'ravi');
    await user.type(screen.getByLabelText('Password'), 'secret1{Enter}');
}

const BILLING = 'Billing arrives in Phase 3';

beforeEach(() => {
    invokeMock.mockReset();
    localStorage.clear();
});

describe('sign-in', () => {
    it('signs in with Enter and opens the POS workspace when pos.use is granted', async () => {
        const user = userEvent.setup();
        bridge({restore_session: () => reply(401), login: () => reply(200, {me: me(['pos.use'])})});
        renderApp();
        await signIn(user);

        expect(await screen.findByRole('heading', {name: BILLING})).toHaveFocus();
        expect(screen.getByText('Sharma Kirana')).toBeInTheDocument();
        expect(screen.getByText('Main counter')).toBeInTheDocument();
        expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
        expect(screen.getByText('Cashier')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Log out'})).toBeInTheDocument();
        expect(invokeMock).toHaveBeenCalledWith('login', {
            identifier: 'ravi',
            password: 'secret1',
            kiranaId: undefined,
        });
    });

    it('asks for the business on a 409 and resends with kiranaId', async () => {
        const user = userEvent.setup();
        bridge({
            restore_session: () => reply(401),
            login: ({kiranaId}) =>
                kiranaId
                    ? reply(200, {me: me(['pos.use'])})
                    : reply(409, undefined, {
                          errors: [
                              {id: 'k1', name: 'Sharma Kirana'},
                              {id: 'k2', name: 'Patil Stores'},
                          ],
                      }),
        });
        renderApp();
        await signIn(user);

        const picker = await screen.findByRole('combobox', {name: 'Business'});
        expect(picker).toHaveFocus();
        await user.selectOptions(picker, 'Patil Stores');
        await user.keyboard('{Enter}');

        expect(await screen.findByRole('heading', {name: BILLING})).toBeInTheDocument();
        expect(invokeMock).toHaveBeenLastCalledWith('login', {
            identifier: 'ravi',
            password: 'secret1',
            kiranaId: 'k2',
        });
    });

    it.each([
        [401, 'Wrong username, email or password.'],
        [403, "This account can't sign in here."],
        [429, 'Too many attempts.'],
        [0, "Can't reach the KiranaOS server."],
    ])('shows one plain, translated message for status %i', async (status, message) => {
        const user = userEvent.setup();
        bridge({
            restore_session: () => reply(401),
            login: () => reply(status, undefined, {message: 'Invalid credentials for ravi'}),
        });
        renderApp();
        await signIn(user);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(message);
        expect(alert).not.toHaveTextContent('ravi');
        expect(screen.getByLabelText('Password')).toHaveFocus();
    });

    it('flags empty fields without calling the API', async () => {
        const user = userEvent.setup();
        bridge({restore_session: () => reply(401)});
        renderApp();
        await user.click(await screen.findByRole('button', {name: 'Sign in'}));

        expect(screen.getByText('Username or email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
        expect(screen.getByLabelText('Username or email')).toHaveFocus();
        expect(invokeMock).not.toHaveBeenCalledWith('login', expect.anything());
    });
});

describe('routing by permission', () => {
    it('restores a saved session straight into the POS for pos.use, whatever the role', async () => {
        bridge({restore_session: () => reply(200, me(['pos.use'], 'STAFF'))});
        renderApp();
        expect(await screen.findByRole('heading', {name: BILLING})).toBeInTheDocument();
        expect(screen.getByText('Staff')).toBeInTheDocument();
    });

    it('without pos.use shows the web-admin screen, even for an owner role, and logs out', async () => {
        const user = userEvent.setup();
        bridge({
            restore_session: () => reply(200, me(['business.read', 'reports.view'], 'OWNER')),
            logout: () => undefined,
        });
        renderApp();

        expect(
            await screen.findByRole('heading', {name: 'This device is for billing'}),
        ).toBeInTheDocument();
        expect(screen.getByText('Use the web admin for your role.')).toBeInTheDocument();
        expect(screen.getByText('Owner at Sharma Kirana')).toBeInTheDocument();
        expect(screen.queryByText(BILLING)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Log out'}));
        expect(await screen.findByRole('heading', {name: 'Sign in'})).toBeInTheDocument();
        expect(invokeMock).toHaveBeenCalledWith('logout');
    });

    it('falls back to sign-in when the session cannot be restored', async () => {
        invokeMock.mockRejectedValue(new Error('IPC unavailable'));
        renderApp();
        expect(await screen.findByRole('heading', {name: 'Sign in'})).toBeInTheDocument();
    });
});

describe('language', () => {
    it('switches to Marathi and remembers the choice', async () => {
        const user = userEvent.setup();
        bridge({restore_session: () => reply(401)});
        renderApp();
        await user.selectOptions(await screen.findByRole('combobox', {name: 'Language'}), 'mr');

        expect(screen.getByRole('heading', {name: 'साइन इन'})).toBeInTheDocument();
        expect(screen.getByLabelText('युझरनेम किंवा ईमेल')).toBeInTheDocument();
        expect(document.documentElement.lang).toBe('mr');
        expect(localStorage.getItem('kirana.lang')).toBe('mr');
    });
});
