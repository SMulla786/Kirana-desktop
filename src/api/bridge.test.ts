import {invoke} from '@tauri-apps/api/core';
import {expect, it, vi} from 'vitest';
import {api} from './bridge';

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn()}));

it('api() goes through the Rust session and unwraps the envelope', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
        status: 200,
        body: {status: true, message: 'OK', data: {name: 'Sharma Kirana'}},
    });
    await expect(api('GET', '/business')).resolves.toEqual({name: 'Sharma Kirana'});
    expect(invoke).toHaveBeenCalledWith('api_request', {
        method: 'GET',
        path: '/business',
        body: undefined,
    });
});

it('api() turns a failed reply into an ApiError with the status and errors', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
        status: 403,
        body: {status: false, message: 'Forbidden', errors: [{field: 'x'}]},
    });
    await expect(api('PATCH', '/business', {name: 'x'})).rejects.toMatchObject({
        name: 'ApiError',
        status: 403,
        message: 'Forbidden',
        errors: [{field: 'x'}],
    });
});
