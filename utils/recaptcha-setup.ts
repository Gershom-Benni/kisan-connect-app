// utils/recaptcha-setup.ts
import { Platform } from 'react-native';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

export const setupRecaptcha = () => {
    // Only setup web reCAPTCHA for web platform
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.recaptchaVerifier) {
            console.log('reCAPTCHA already initialized');
            return;
        }

        const container = document.getElementById('recaptcha-container');
        if (!container) {
            console.error('recaptcha-container element not found');
            return;
        }

        try {
            window.recaptchaVerifier = new RecaptchaVerifier(
                'recaptcha-container',
                {
                    size: 'invisible',
                    callback: (response: string) => {
                        console.log('reCAPTCHA solved:', response);
                    },
                    'expired-callback': () => {
                        console.warn('reCAPTCHA expired.');
                    }
                },
                auth
            );
            console.log('reCAPTCHA initialized for web');
        } catch (error) {
            console.error('Failed to initialize reCAPTCHA:', error);
        }
    }
    // For mobile (iOS/Android), we'll use FirebaseRecaptchaVerifierModal in the component
};