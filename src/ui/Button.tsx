import type {ButtonHTMLAttributes} from 'react';
import {Spinner} from './Spinner';

// Copied from kirana-F src/ui/Button.tsx (A-025: no shared package).
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
    block?: boolean;
    loading?: boolean;
};

export function Button({
    variant = 'primary',
    block = false,
    loading = false,
    type = 'button',
    className,
    disabled,
    children,
    ...rest
}: ButtonProps) {
    const classes = ['k-btn', `k-btn--${variant}`, block && 'k-btn--block', className];
    return (
        <button
            {...rest}
            type={type}
            className={classes.filter(Boolean).join(' ')}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
}
