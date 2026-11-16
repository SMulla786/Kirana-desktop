import {useEffect, useRef, useState} from 'react';
import type {Me} from '../api/types';
import {useAuth} from '../auth/AuthContext';
import {useT} from '../i18n';
import {Button, MonitorIcon} from '../ui';
import {AuthCard} from './AuthCard';

/** Signed in, but without `pos.use`: this device only bills. */
export function NoPosAccess({me}: {me: Me}) {
    const {logout} = useAuth();
    const {t} = useT();
    const [leaving, setLeaving] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const role = me.membershipRole && t(`roles.${me.membershipRole}`);
    return (
        <AuthCard>
            <span className="empty__icon">
                <MonitorIcon />
            </span>
            <div className="auth__intro">
                <h1 ref={headingRef} tabIndex={-1}>
                    {t('noPos.title')}
                </h1>
                <p className="auth__lead">{t('noPos.text')}</p>
            </div>
            <div className="auth__account">
                <p>{t('noPos.signedIn', {name: me.user.fullname})}</p>
                {role && me.business && (
                    <p className="auth__muted">
                        {t('noPos.roleAt', {role, business: me.business.name})}
                    </p>
                )}
            </div>
            <Button
                block
                loading={leaving}
                onClick={() => {
                    setLeaving(true);
                    void logout();
                }}
            >
                {t('common.logout')}
            </Button>
        </AuthCard>
    );
}
