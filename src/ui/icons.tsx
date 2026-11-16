import type {SVGProps} from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
} as const;

/** KiranaOS mark: a shop awning over a counter. Same drawing as app-icon.svg. */
export function BrandMark({size = 32}: {size?: number}) {
    return (
        <svg className="k-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
            <rect className="k-mark__tile" width="32" height="32" rx="8" />
            <path
                className="k-mark__ink"
                d="M7 8.5h18v4.5a2.25 2.25 0 0 1-4.5 0a2.25 2.25 0 0 1-4.5 0a2.25 2.25 0 0 1-4.5 0a2.25 2.25 0 0 1-4.5 0z"
            />
            <path className="k-mark__line" d="M9 17.5v6h14v-6" />
        </svg>
    );
}

export function AlertIcon(props: IconProps) {
    return (
        <svg {...stroke} {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
    );
}

export function ReceiptIcon(props: IconProps) {
    return (
        <svg {...stroke} {...props}>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
            <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
    );
}

export function MonitorIcon(props: IconProps) {
    return (
        <svg {...stroke} {...props}>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
        </svg>
    );
}
