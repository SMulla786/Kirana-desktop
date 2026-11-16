export function Spinner({large = false}: {large?: boolean}) {
    return <span className={large ? 'k-spinner k-spinner--lg' : 'k-spinner'} aria-hidden="true" />;
}
