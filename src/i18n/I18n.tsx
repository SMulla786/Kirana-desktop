// Adapted from kirana-F src/i18n/I18n.tsx (no number/date formatting yet: nothing here shows any).
import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {en} from './en';
import {hi} from './hi';
import {mr} from './mr';
import type {MessageKey, Messages} from './types';

export const LANGS = ['en', 'hi', 'mr'] as const;
export type Lang = (typeof LANGS)[number];
export const LANGUAGE_NAMES: Record<Lang, string> = {en: 'English', hi: 'हिन्दी', mr: 'मराठी'};
const DICTS: Record<Lang, Messages> = {en, hi, mr};
export const STORAGE_KEY = 'kirana.lang';

type Vars = Record<string, string | number>;

function lookup(dict: Messages, key: string): string | undefined {
    let node: unknown = dict;
    for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
    return typeof node === 'string' ? node : undefined;
}

function makeValue(lang: Lang, setLang: (lang: Lang) => void) {
    return {
        lang,
        setLang,
        t(key: MessageKey, vars?: Vars): string {
            const text = lookup(DICTS[lang], key) ?? lookup(en, key) ?? key;
            if (!vars) return text;
            return text.replace(/\{(\w+)\}/g, (match, name: string) =>
                name in vars ? String(vars[name]) : match,
            );
        },
    };
}

export type I18n = ReturnType<typeof makeValue>;

// Defaults to English, so components also render outside the provider (e.g. in unit tests).
const I18nContext = createContext<I18n>(makeValue('en', () => {}));
export const useT = () => useContext(I18nContext);

function storedLang(): Lang | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return LANGS.includes(saved as Lang) ? (saved as Lang) : null;
    } catch {
        return null; // storage blocked: fall back to English
    }
}

export function I18nProvider({children}: {children: ReactNode}) {
    const [lang, setLangState] = useState<Lang>(() => storedLang() ?? 'en');

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const value = useMemo(
        () =>
            makeValue(lang, (next) => {
                setLangState(next);
                try {
                    localStorage.setItem(STORAGE_KEY, next);
                } catch {
                    // storage blocked: the choice lasts for this session only
                }
            }),
        [lang],
    );
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
