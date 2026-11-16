import {useAuth} from './auth/AuthContext';
import {Login} from './screens/Login';
import {NoPosAccess} from './screens/NoPosAccess';
import {PosWorkspace} from './screens/PosWorkspace';
import {Splash} from './screens/Splash';
import './screens/screens.css';

export function App() {
    const {status, me} = useAuth();
    if (status === 'loading') return <Splash />;
    if (!me) return <Login />;
    // By permission, never by role name. Kirana-B enforces it; this only picks the screen.
    return me.permissions.includes('pos.use') ? <PosWorkspace me={me} /> : <NoPosAccess me={me} />;
}
