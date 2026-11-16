// Shared wording is copied from kirana-F src/i18n/en (A-025): keep the two apps' terms aligned.
export const en = {
    common: {
        language: 'Language',
        required: '{label} is required',
        logout: 'Log out',
    },
    session: {
        checking: 'Checking your session…',
    },
    login: {
        title: 'Sign in',
        product: 'Desktop POS',
        identifier: 'Username or email',
        password: 'Password',
        business: 'Business',
        chooseBusiness: 'Choose a business',
        businessHint:
            'This account works in more than one business. Choose the one for this counter.',
        submit: 'Sign in',
        webAdmin: 'Forgot your password or need an account? Use the KiranaOS web admin.',
        errors: {
            invalid: 'Wrong username, email or password.',
            blocked:
                "This account can't sign in here. Ask the shop owner to check your access, or verify your email in the web admin.",
            tooMany: 'Too many attempts. Wait a few minutes, then try again.',
            offline: "Can't reach the KiranaOS server. Check the connection and try again.",
            failed: "Sign-in didn't go through. Try again.",
        },
    },
    roles: {
        OWNER: 'Owner',
        MANAGER: 'Manager',
        CASHIER: 'Cashier',
        INVENTORY_MANAGER: 'Inventory manager',
        ACCOUNTANT: 'Accountant',
        STAFF: 'Staff',
    },
    pos: {
        billingTitle: 'Billing arrives in Phase 3',
        billingText: 'Product search, the cart and checkout will appear here.',
    },
    noPos: {
        title: 'This device is for billing',
        text: 'Use the web admin for your role.',
        signedIn: 'Signed in as {name}',
        roleAt: '{role} at {business}',
    },
};
