// Copied from kirana-F src/i18n/types.ts.
import type {en} from './en';

type Shape<T> = {[K in keyof T]: T[K] extends string ? string : Shape<T[K]>};
/** hi/mr must match en exactly: a missing or extra key is a type error. */
export type Messages = Shape<typeof en>;

type Leaves<T, P extends string = ''> = {
    [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
/** Dot paths into the English dictionary, e.g. 'login.submit'. */
export type MessageKey = Leaves<typeof en>;
