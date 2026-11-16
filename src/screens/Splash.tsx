import {useT} from '../i18n';
import {Spinner} from '../ui';

export function Splash() {
    const {t} = useT();
    return (
        <main className="splash">
            <Spinner large />
            <p role="status">{t('session.checking')}</p>
        </main>
    );
}
