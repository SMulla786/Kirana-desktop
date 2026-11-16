import {AlertIcon} from './icons';

/** An error message with an icon (never colour alone), announced when it appears. */
export function Alert({message}: {message: string}) {
    return (
        <p className="k-alert k-reveal" role="alert">
            <AlertIcon className="k-alert__icon" />
            <span>{message}</span>
        </p>
    );
}
