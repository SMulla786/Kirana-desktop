import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import * as bridge from '../api/bridge';
import type {Me} from '../api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthValue {
    status: AuthStatus;
    me: Me | null;
    login: (identifier: string, password: string, kiranaId?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside AuthProvider');
    return value;
}

export function AuthProvider({children}: {children: ReactNode}) {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [me, setMe] = useState<Me | null>(null);

    const set = useCallback((next: Me | null) => {
        setMe(next);
        setStatus(next ? 'authenticated' : 'anonymous');
    }, []);

    useEffect(() => {
        // Rust refreshes from the stored token, then loads /auth/me; any failure means sign in.
        bridge.restoreSession().then(set, () => set(null));
    }, [set]);

    const value = useMemo<AuthValue>(
        () => ({
            status,
            me,
            async login(identifier, password, kiranaId) {
                set(await bridge.login(identifier, password, kiranaId));
            },
            async logout() {
                try {
                    await bridge.logout();
                } finally {
                    set(null);
                }
            },
        }),
        [status, me, set],
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
