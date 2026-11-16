// Copied from kirana-F src/i18n/LanguageSwitcher.tsx.
import {LANGS, LANGUAGE_NAMES, useT} from './I18n';
import type {Lang} from './I18n';

export function LanguageSwitcher() {
    const {lang, setLang, t} = useT();
    return (
        <label className="k-lang">
            <span className="visually-hidden">{t('common.language')}</span>
            <select
                className="k-input k-lang__select"
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
            >
                {LANGS.map((l) => (
                    <option key={l} value={l} lang={l}>
                        {LANGUAGE_NAMES[l]}
                    </option>
                ))}
            </select>
        </label>
    );
}
