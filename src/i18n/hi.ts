// Machine-drafted translation: needs native-speaker review (A-024). Shared terms copied from kirana-F.
import type {Messages} from './types';

export const hi: Messages = {
    common: {
        language: 'भाषा',
        required: '{label} आवश्यक है',
        logout: 'लॉग आउट',
    },
    session: {
        checking: 'आपका सेशन जाँचा जा रहा है…',
    },
    login: {
        title: 'साइन इन',
        product: 'डेस्कटॉप POS',
        identifier: 'यूज़रनेम या ईमेल',
        password: 'पासवर्ड',
        business: 'दुकान',
        chooseBusiness: 'दुकान चुनें',
        businessHint: 'यह अकाउंट एक से ज़्यादा दुकानों में काम करता है। इस काउंटर के लिए दुकान चुनें।',
        submit: 'साइन इन',
        webAdmin: 'पासवर्ड भूल गए या नया अकाउंट चाहिए? KiranaOS वेब एडमिन का इस्तेमाल करें।',
        errors: {
            invalid: 'यूज़रनेम, ईमेल या पासवर्ड गलत है।',
            blocked:
                'यह अकाउंट यहाँ साइन इन नहीं कर सकता। दुकान मालिक से अपनी अनुमति जाँचने को कहें, या वेब एडमिन में अपना ईमेल सत्यापित करें।',
            tooMany: 'बहुत ज़्यादा कोशिशें हुईं। कुछ मिनट रुककर फिर से कोशिश करें।',
            offline: 'KiranaOS सर्वर से संपर्क नहीं हो पा रहा। कनेक्शन जाँचें और फिर से कोशिश करें।',
            failed: 'साइन इन नहीं हो सका। फिर से कोशिश करें।',
        },
    },
    roles: {
        OWNER: 'मालिक',
        MANAGER: 'मैनेजर',
        CASHIER: 'कैशियर',
        INVENTORY_MANAGER: 'स्टॉक मैनेजर',
        ACCOUNTANT: 'मुनीम',
        STAFF: 'स्टाफ',
    },
    pos: {
        billingTitle: 'बिलिंग चरण 3 में आएगी',
        billingText: 'प्रोडक्ट खोज, कार्ट और चेकआउट यहाँ दिखेंगे।',
    },
    noPos: {
        title: 'यह डिवाइस बिलिंग के लिए है',
        text: 'अपनी भूमिका के काम के लिए वेब एडमिन का इस्तेमाल करें।',
        signedIn: '{name} के रूप में साइन इन',
        roleAt: '{business} में {role}',
    },
};
