/**
 * Data Protection Utility
 * Provides encryption/decryption for sensitive data like phone numbers
 * Uses AES-256-GCM for secure encryption
 */

const crypto = require('crypto');

class DataProtection {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16; // 128 bits

        // Get encryption key from environment
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }

        if (encryptionKey.length !== this.keyLength) {
            throw new Error(`ENCRYPTION_KEY must be exactly ${this.keyLength} characters long`);
        }

        this.key = Buffer.from(encryptionKey, 'utf8');
    }

    /**
     * Encrypt sensitive data
     * @param {string} plaintext - Data to encrypt
     * @returns {string} Encrypted data in format: iv:ciphertext (base64 encoded)
     */
    encrypt(plaintext) {
        if (!plaintext || typeof plaintext !== 'string') {
            throw new Error('Plaintext must be a non-empty string');
        }

        try {
            // Generate random IV for each encryption
            const iv = crypto.randomBytes(this.ivLength);

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

            // Encrypt the data
            let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
            ciphertext += cipher.final('base64');

            // Combine IV and ciphertext
            const result = `${iv.toString('base64')}:${ciphertext}`;

            return result;
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt sensitive data
     * @param {string} encryptedData - Encrypted data in format: iv:ciphertext
     * @returns {string} Decrypted plaintext
     */
    decrypt(encryptedData) {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new Error('Encrypted data must be a non-empty string');
        }

        try {
            // Split the encrypted data
            const parts = encryptedData.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }

            const [ivBase64, ciphertext] = parts;

            // Convert from base64
            const iv = Buffer.from(ivBase64, 'base64');

            // Validate lengths
            if (iv.length !== this.ivLength) {
                throw new Error('Invalid IV length');
            }

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

            // Decrypt the data
            let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
            plaintext += decipher.final('utf8');

            return plaintext;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Encrypt phone number specifically
     * @param {string} phoneNumber - Phone number to encrypt
     * @returns {Object} Object with encrypted and original phone
     */
    encryptPhone(phoneNumber) {
        if (!phoneNumber) {
            return { encrypted: null, original: null };
        }

        try {
            const encrypted = this.encrypt(phoneNumber);
            return {
                encrypted: encrypted,
                original: phoneNumber
            };
        } catch (error) {
            throw new Error(`Phone encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt phone number specifically
     * @param {string} encryptedPhone - Encrypted phone number
     * @returns {string} Decrypted phone number
     */
    decryptPhone(encryptedPhone) {
        if (!encryptedPhone) {
            return null;
        }

        try {
            return this.decrypt(encryptedPhone);
        } catch (error) {
            throw new Error(`Phone decryption failed: ${error.message}`);
        }
    }

    /**
     * Hash sensitive data for comparison (one-way)
     * @param {string} data - Data to hash
     * @returns {string} SHA-256 hash
     */
    hash(data) {
        if (!data || typeof data !== 'string') {
            throw new Error('Data must be a non-empty string');
        }

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate secure random token
     * @param {number} length - Token length in bytes (default: 32)
     * @returns {string} Random token in hex format
     */
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Validate encryption key format
     * @param {string} key - Key to validate
     * @returns {boolean} True if valid
     */
    static validateEncryptionKey(key) {
        if (!key || typeof key !== 'string') {
            return false;
        }
        return key.length === 32;
    }
}

module.exports = DataProtection;