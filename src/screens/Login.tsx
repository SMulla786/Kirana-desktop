import {useEffect, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {ApiError} from '../api/bridge';
import type {BusinessChoice} from '../api/types';
import {useAuth} from '../auth/AuthContext';
import {useT} from '../i18n';
import type {MessageKey} from '../i18n';
import {Alert, Button, Select, TextField} from '../ui';
import {AuthCard} from './AuthCard';

type Field = 'identifier' | 'password' | 'kiranaId';

const LABELS: Record<Field, MessageKey> = {
    identifier: 'login.identifier',
    password: 'login.password',
    kiranaId: 'login.business',
};

/** One translated message per kind of failure; server wording and account details never show. */
export function loginErrorKey(error: unknown): MessageKey {
    const status = error instanceof ApiError ? error.status : -1;
    if (status === 0) return 'login.errors.offline';
    if (status === 400 || status === 401) return 'login.errors.invalid';
    if (status === 403) return 'login.errors.blocked';
    if (status === 429) return 'login.errors.tooMany';
    return 'login.errors.failed';
}

export function Login() {
    const {login} = useAuth();
    const {t} = useT();
    const [businesses, setBusinesses] = useState<BusinessChoice[] | null>(null);
    const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
    const [failure, setFailure] = useState<{key: MessageKey; attempt: number} | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const businessRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (businesses) businessRef.current?.focus();
    }, [businesses]);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const value = (name: Field) => String(data.get(name) ?? '');
        const fields: Field[] = businesses
            ? ['identifier', 'password', 'kiranaId']
            : ['identifier', 'password'];
        const missing = fields.filter((name) => !value(name).trim());
        setErrors(
            Object.fromEntries(
                missing.map((name) => [name, t('common.required', {label: t(LABELS[name])})]),
            ),
        );
        if (missing.length) {
            (form.elements.namedItem(missing[0]) as HTMLElement | null)?.focus();
            return;
        }

        setSubmitting(true);
        setFailure(null);
        try {
            await login(
                value('identifier').trim(),
                value('password'),
                value('kiranaId') || undefined,
            );
        } catch (error) {
            setSubmitting(false);
            if (error instanceof ApiError && error.status === 409) {
                setBusinesses(
                    Array.isArray(error.errors) ? (error.errors as BusinessChoice[]) : [],
                );
                return;
            }
            // A new key per attempt re-announces (and re-reveals) the alert on a repeat failure.
            setFailure((prev) => ({key: loginErrorKey(error), attempt: (prev?.attempt ?? 0) + 1}));
            const password = form.elements.namedItem('password') as HTMLInputElement | null;
            password?.focus();
            password?.select();
        }
    }

    return (
        <AuthCard>
            <h1>{t('login.title')}</h1>
            <form className="auth__form" onSubmit={onSubmit} noValidate>
                <TextField
                    name="identifier"
                    label={t('login.identifier')}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    error={errors.identifier}
                    // The business list belongs to the account typed before; a new one starts over.
                    onChange={() => businesses && setBusinesses(null)}
                />
                <TextField
                    name="password"
                    type="password"
                    label={t('login.password')}
                    autoComplete="current-password"
                    error={errors.password}
                />
                {businesses && (
                    <Select
                        ref={businessRef}
                        className="k-reveal"
                        name="kiranaId"
                        label={t('login.business')}
                        hint={t('login.businessHint')}
                        placeholder={t('login.chooseBusiness')}
                        options={businesses.map((b) => ({value: b.id, label: b.name}))}
                        error={errors.kiranaId}
                        // Enter on a closed select submits too, so the whole form stays keyboard-only.
                        onKeyDown={(e) =>
                            e.key === 'Enter' && e.currentTarget.form?.requestSubmit()
                        }
                    />
                )}
                {failure && <Alert key={failure.attempt} message={t(failure.key)} />}
                <Button type="submit" block loading={submitting}>
                    {t('login.submit')}
                </Button>
            </form>
            <p className="auth__foot">{t('login.webAdmin')}</p>
        </AuthCard>
    );
}
