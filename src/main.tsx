import './styles/tokens.css';
import './styles/global.css';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {AuthProvider} from './auth/AuthContext';
import {I18nProvider} from './i18n';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <I18nProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </I18nProvider>
    </StrictMode>,
);
