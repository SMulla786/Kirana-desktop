// Machine-drafted translation: needs native-speaker review (A-024). Shared terms copied from kirana-F.
import type {Messages} from './types';

export const mr: Messages = {
    common: {
        language: 'भाषा',
        required: '{label} आवश्यक आहे',
        logout: 'लॉग आउट',
    },
    session: {
        checking: 'तुमचे सत्र तपासत आहोत…',
    },
    login: {
        title: 'साइन इन',
        product: 'डेस्कटॉप POS',
        identifier: 'युझरनेम किंवा ईमेल',
        password: 'पासवर्ड',
        business: 'दुकान',
        chooseBusiness: 'दुकान निवडा',
        businessHint: 'हे अकाउंट एकापेक्षा जास्त दुकानांमध्ये चालते. या काउंटरसाठी दुकान निवडा.',
        submit: 'साइन इन',
        webAdmin: 'पासवर्ड विसरलात किंवा नवीन अकाउंट हवे आहे? KiranaOS वेब अ‍ॅडमिन वापरा.',
        errors: {
            invalid: 'युझरनेम, ईमेल किंवा पासवर्ड चुकीचा आहे.',
            blocked:
                'हे अकाउंट इथे साइन इन करू शकत नाही. दुकान मालकाला तुमची परवानगी तपासायला सांगा, किंवा वेब अ‍ॅडमिनमध्ये तुमचा ईमेल पडताळा.',
            tooMany: 'खूप जास्त प्रयत्न झाले. काही मिनिटे थांबून पुन्हा प्रयत्न करा.',
            offline: 'KiranaOS सर्व्हरशी संपर्क होत नाही. कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
            failed: 'साइन इन होऊ शकले नाही. पुन्हा प्रयत्न करा.',
        },
    },
    roles: {
        OWNER: 'मालक',
        MANAGER: 'व्यवस्थापक',
        CASHIER: 'कॅशियर',
        INVENTORY_MANAGER: 'स्टॉक व्यवस्थापक',
        ACCOUNTANT: 'मुनीम',
        STAFF: 'कर्मचारी',
    },
    pos: {
        billingTitle: 'बिलिंग टप्पा 3 मध्ये येईल',
        billingText: 'उत्पादन शोध, कार्ट आणि चेकआउट इथे दिसतील.',
    },
    noPos: {
        title: 'हे डिव्हाइस बिलिंगसाठी आहे',
        text: 'तुमच्या भूमिकेसाठी वेब अ‍ॅडमिन वापरा.',
        signedIn: '{name} म्हणून साइन इन',
        roleAt: '{business} मध्ये {role}',
    },
};
