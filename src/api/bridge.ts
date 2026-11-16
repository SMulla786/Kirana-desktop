// The webview's only way to the API: Tauri commands in src-tauri/src/main.rs. The Rust side owns
// the tokens, adds `Authorization: Bearer` and refreshes once on a 401; nothing here sees a token.
import {invoke} from '@tauri-apps/api/core';
import type {Envelope, Me} from './types';

/** What every command returns: the HTTP status (0 = server unreachable) and Kirana-B's envelope. */
interface Reply {
    status: number;
    body: Partial<Envelope<unknown>> | null;
}

export class ApiError extends Error {
    status: number;
    errors: unknown;
    constructor(message: string, status: number, errors?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

function unwrap<T>({status, body}: Reply): T {
    if (status < 200 || status >= 300 || body?.status === false) {
        throw new ApiError(body?.message ?? 'Request failed', status, body?.errors);
    }
    return body?.data as T;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Any Kirana-B call, e.g. api('GET', '/catalog/products'). Paths are relative to /api/v1. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
    return unwrap<T>(await invoke<Reply>('api_request', {method, path, body}));
}

/** Throws ApiError; a 409 carries the BusinessChoice list in `errors`. */
export async function login(identifier: string, password: string, kiranaId?: string): Promise<Me> {
    return unwrap<{me: Me}>(await invoke<Reply>('login', {identifier, password, kiranaId})).me;
}

export async function restoreSession(): Promise<Me> {
    return unwrap<Me>(await invoke<Reply>('restore_session'));
}

export function logout(): Promise<void> {
    return invoke('logout');
}
