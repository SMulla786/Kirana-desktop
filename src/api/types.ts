// Hand-copied from kirana-F src/api/schema.d.ts (Kirana-B's OpenAPI `Me` and `BusinessChoice`).
// shortcut: no generator here yet; run openapi-typescript like kirana-F once screens use more of the API.

export type MembershipRole =
    'OWNER' | 'MANAGER' | 'CASHIER' | 'INVENTORY_MANAGER' | 'ACCOUNTANT' | 'STAFF';

/** GET /auth/me */
export interface Me {
    user: {
        id: string;
        username: string;
        email: string;
        fullname: string;
        phoneNumber: string;
        role: 'ADMIN' | 'KIRANA' | 'EMPLOYEE';
    };
    business: {id: string; name: string} | null;
    store: {id: string; name: string} | null;
    membershipRole: MembershipRole | null;
    permissions: string[];
}

/** A 409 from POST /auth/login ("Select a business") lists these in `errors`. */
export interface BusinessChoice {
    id: string;
    name: string;
}

/** Kirana-B's response wrapper. */
export interface Envelope<T> {
    statusCode: number;
    status: boolean;
    message: string;
    data: T;
    errors?: unknown;
}
