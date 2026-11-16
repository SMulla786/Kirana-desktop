import type {ReactNode} from 'react';
import {LanguageSwitcher, useT} from '../i18n';
import {BrandMark} from '../ui';

/** The centred card used before billing starts: sign-in and "not for billing". */
export function AuthCard({children}: {children: ReactNode}) {
    const {t} = useT();
    return (
        <main className="auth">
            <div className="auth__card">
                <header className="auth__head">
                    <div className="auth__brand">
                        <BrandMark size={36} />
                        <div>
                            <p className="auth__name">KiranaOS</p>
                            <p className="auth__product">{t('login.product')}</p>
                        </div>
                    </div>
                    <LanguageSwitcher />
                </header>
                {children}
            </div>
        </main>
    );
}
