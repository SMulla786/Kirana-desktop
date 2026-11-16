import {useId} from 'react';
import type {ComponentProps} from 'react';

// Copied from kirana-F src/ui/Select.tsx, plus an optional hint line.
export type SelectProps = ComponentProps<'select'> & {
    label: string;
    hint?: string;
    error?: string;
    options: {value: string; label: string}[];
    placeholder?: string;
};

export function Select({
    label,
    hint,
    error,
    options,
    placeholder,
    id,
    className,
    ...rest
}: SelectProps) {
    const auto = useId();
    const selectId = id ?? auto;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;
    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
    return (
        <div className={`k-field${className ? ` ${className}` : ''}`}>
            <label className="k-field__label" htmlFor={selectId}>
                {label}
            </label>
            {hint && (
                <p id={hintId} className="k-field__hint">
                    {hint}
                </p>
            )}
            <select
                {...rest}
                id={selectId}
                className="k-input"
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
            >
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            {error && (
                <p id={errorId} className="k-field__error">
                    {error}
                </p>
            )}
        </div>
    );
}
