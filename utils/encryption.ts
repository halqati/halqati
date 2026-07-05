
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'quran-circle-manager-secret-key-123'; // In a real app, this should be more secure

export const encrypt = (text: string): string => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (cipherText: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("Decryption failed", e);
        return '';
    }
};
