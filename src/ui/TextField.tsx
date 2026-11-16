import {useId} from 'react';
import type {ComponentProps} from 'react';

// Copied from kirana-F src/ui/TextField.tsx; ComponentProps so `ref` passes through (React 19).
export type TextFieldProps = ComponentProps<'input'> & {
    label: string;
    error?: string;
};

export function TextField({label, error, id, className, ...rest}: TextFieldProps) {
    const auto = useId();
    const inputId = id ?? auto;
    const errorId = `${inputId}-error`;
    return (
        <div className="k-field">
            <label className="k-field__label" htmlFor={inputId}>
                {label}
            </label>
            <input
                {...rest}
                id={inputId}
                className={`k-input${className ? ` ${className}` : ''}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
            />
            {error && (
                <p id={errorId} className="k-field__error">
                    {error}
                </p>
            )}
        </div>
    );
}
