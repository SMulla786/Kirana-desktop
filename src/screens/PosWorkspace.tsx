import {useEffect, useRef, useState} from 'react';
import type {Me} from '../api/types';
import {useAuth} from '../auth/AuthContext';
import {LanguageSwitcher, useT} from '../i18n';
import {BrandMark, Button, ReceiptIcon} from '../ui';

/** Phase 1 placeholder: the real header and an empty billing area. No numbers until billing exists. */
export function PosWorkspace({me}: {me: Me}) {
    const {logout} = useAuth();
    const {t} = useT();
    const [leaving, setLeaving] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus(); // tells screen readers where sign-in landed
    }, []);

    const business = me.business?.name ?? 'KiranaOS';
    const role = me.membershipRole && t(`roles.${me.membershipRole}`);
    return (
        <div className="pos">
            <header className="pos__bar">
                <BrandMark size={32} />
                <div className="pos__shop">
                    <p className="pos__business truncate" title={business}>
                        {business}
                    </p>
                    {me.store && (
                        <p className="pos__meta truncate" title={me.store.name}>
                            {me.store.name}
                        </p>
                    )}
                </div>
                <div className="pos__user">
                    <p className="pos__name truncate" title={me.user.fullname}>
                        {me.user.fullname}
                    </p>
                    {role && <p className="pos__meta truncate">{role}</p>}
                </div>
                <LanguageSwitcher />
                <Button
                    variant="secondary"
                    loading={leaving}
                    onClick={() => {
                        setLeaving(true);
                        void logout();
                    }}
                >
                    {t('common.logout')}
                </Button>
            </header>
            <main className="pos__main">
                <section className="pos__billing" aria-labelledby="billing-title">
                    <div className="empty">
                        <span className="empty__icon">
                            <ReceiptIcon />
                        </span>
                        <h1 id="billing-title" ref={headingRef} tabIndex={-1}>
                            {t('pos.billingTitle')}
                        </h1>
                        <p className="empty__text">{t('pos.billingText')}</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
