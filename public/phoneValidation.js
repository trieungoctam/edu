/**
 * Phone Validation Utility
 * Handles Vietnamese phone number validation and standardization
 * Supports both client-side and server-side usage
 */

class PhoneValidator {
  constructor() {
    // Vietnamese mobile network prefixes (updated as of 2024)
    this.validPrefixes = {
      viettel: ['032', '033', '034', '035', '036', '037', '038', '039', '086', '096', '097', '098'],
      vinaphone: ['081', '082', '083', '084', '085', '088', '091', '094'],
      mobifone: ['070', '076', '077', '078', '079', '089', '090', '093'],
      vietnamobile: ['052', '056', '058', '092'],
      gmobile: ['059', '099']
    };

    // Compile all valid prefixes
    this.allValidPrefixes = Object.values(this.validPrefixes).flat();
  }

  /**
   * Validate Vietnamese phone number format
   * @param {string} phone - Phone number to validate
   * @returns {Object} Validation result with details
   */
  validate(phone) {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        error: 'Vui lòng nhập số điện thoại',
        errorCode: 'EMPTY_PHONE'
      };
    }

    // Clean the phone number (remove spaces, dashes, parentheses, dots)
    const cleanPhone = this.cleanPhoneNumber(phone);

    // Check basic format patterns
    const formatValidation = this.validateFormat(cleanPhone);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // Check network prefix
    const prefixValidation = this.validatePrefix(cleanPhone);
    if (!prefixValidation.isValid) {
      return prefixValidation;
    }

    // Standardize the phone number
    const standardized = this.standardizePhone(cleanPhone);

    return {
      isValid: true,
      originalPhone: phone,
      cleanPhone: cleanPhone,
      standardizedPhone: standardized,
      network: this.getNetworkProvider(standardized),
      message: 'Số điện thoại hợp lệ'
    };
  }

  /**
   * Clean phone number by removing formatting characters
   * @param {string} phone - Raw phone number
   * @returns {string} Cleaned phone number
   */
  cleanPhoneNumber(phone) {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  /**
   * Validate basic phone number format
   * @param {string} cleanPhone - Cleaned phone number
   * @returns {Object} Format validation result
   */
  validateFormat(cleanPhone) {
    // Check for non-numeric characters (except + at the beginning)
    if (!/^(\+84|0)[0-9]+$/.test(cleanPhone)) {
      return {
        isValid: false,
        error: 'Số điện thoại chỉ được chứa số và dấu +',
        errorCode: 'INVALID_CHARACTERS'
      };
    }

    // Check length for different formats
    if (cleanPhone.startsWith('+84')) {
      if (cleanPhone.length !== 12) {
        return {
          isValid: false,
          error: 'Số điện thoại +84 phải có 12 chữ số (ví dụ: +84901234567)',
          errorCode: 'INVALID_LENGTH_PLUS84'
        };
      }
    } else if (cleanPhone.startsWith('0')) {
      if (cleanPhone.length !== 10) {
        return {
          isValid: false,
          error: 'Số điện thoại phải có 10 chữ số (ví dụ: 0901234567)',
          errorCode: 'INVALID_LENGTH_ZERO'
        };
      }
    } else {
      return {
        isValid: false,
        error: 'Số điện thoại phải bắt đầu bằng 0 hoặc +84',
        errorCode: 'INVALID_PREFIX'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate network prefix
   * @param {string} cleanPhone - Cleaned phone number
   * @returns {Object} Prefix validation result
   */
  validatePrefix(cleanPhone) {
    const standardized = this.standardizePhone(cleanPhone);
    const prefix = standardized.substring(0, 3); // Get first 3 digits (0xx)

    if (!this.allValidPrefixes.includes(prefix)) {
      return {
        isValid: false,
        error: 'Đầu số không hợp lệ. Vui lòng kiểm tra lại số điện thoại',
        errorCode: 'INVALID_NETWORK_PREFIX'
      };
    }

    return { isValid: true };
  }

  /**
   * Standardize phone number to 0xxxxxxxxx format
   * @param {string} cleanPhone - Cleaned phone number
   * @returns {string} Standardized phone number
   */
  standardizePhone(cleanPhone) {
    if (cleanPhone.startsWith('+84')) {
      return '0' + cleanPhone.substring(3);
    }
    return cleanPhone;
  }

  /**
   * Get network provider from phone number
   * @param {string} standardizedPhone - Standardized phone number
   * @returns {string} Network provider name
   */
  getNetworkProvider(standardizedPhone) {
    const prefix = standardizedPhone.substring(0, 3); // Get first 3 digits (0xx)
    
    for (const [network, prefixes] of Object.entries(this.validPrefixes)) {
      if (prefixes.includes(prefix)) {
        return network;
      }
    }
    
    return 'unknown';
  }

  /**
   * Format phone number for display
   * @param {string} phone - Phone number to format
   * @param {string} format - Format type ('standard', 'international', 'display')
   * @returns {string} Formatted phone number
   */
  formatPhone(phone, format = 'display') {
    const validation = this.validate(phone);
    if (!validation.isValid) {
      return phone; // Return original if invalid
    }

    const standardized = validation.standardizedPhone;

    switch (format) {
      case 'international':
        return '+84' + standardized.substring(1);
      case 'standard':
        return standardized;
      case 'display':
        // Format as 0xxx xxx xxxx for better readability
        return standardized.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
      default:
        return standardized;
    }
  }

  /**
   * Get validation error message for UI display
   * @param {string} phone - Phone number
   * @returns {Object} Error details for UI
   */
  getValidationError(phone) {
    const result = this.validate(phone);
    if (result.isValid) {
      return null;
    }

    return {
      message: result.error,
      code: result.errorCode,
      suggestions: this.getErrorSuggestions(result.errorCode)
    };
  }

  /**
   * Get suggestions based on error type
   * @param {string} errorCode - Error code
   * @returns {Array} Array of suggestion strings
   */
  getErrorSuggestions(errorCode) {
    const suggestions = {
      EMPTY_PHONE: ['Vui lòng nhập số điện thoại của bạn'],
      INVALID_CHARACTERS: [
        'Chỉ sử dụng số từ 0-9 và dấu + ở đầu',
        'Ví dụ: 0901234567 hoặc +84901234567'
      ],
      INVALID_LENGTH_ZERO: [
        'Số điện thoại phải có đúng 10 chữ số',
        'Ví dụ: 0901234567'
      ],
      INVALID_LENGTH_PLUS84: [
        'Số điện thoại +84 phải có đúng 12 chữ số',
        'Ví dụ: +84901234567'
      ],
      INVALID_PREFIX: [
        'Số điện thoại phải bắt đầu bằng 0 hoặc +84',
        'Ví dụ: 0901234567 hoặc +84901234567'
      ],
      INVALID_NETWORK_PREFIX: [
        'Đầu số không thuộc nhà mạng Việt Nam',
        'Vui lòng kiểm tra lại số điện thoại'
      ]
    };

    return suggestions[errorCode] || ['Vui lòng kiểm tra lại số điện thoại'];
  }

  /**
   * Real-time validation for input fields
   * @param {string} phone - Current input value
   * @returns {Object} Real-time validation result
   */
  validateRealTime(phone) {
    if (!phone || phone.length === 0) {
      return {
        isValid: null, // Neutral state for empty input
        message: '',
        showError: false
      };
    }

    const cleanPhone = this.cleanPhoneNumber(phone);
    
    // Progressive validation for better UX
    if (cleanPhone.length < 3) {
      return {
        isValid: null,
        message: 'Tiếp tục nhập...',
        showError: false
      };
    }

    const result = this.validate(phone);
    
    if (result.isValid) {
      return {
        isValid: true,
        message: `${result.network.charAt(0).toUpperCase() + result.network.slice(1)} - ${this.formatPhone(phone, 'display')}`,
        showError: false,
        standardized: result.standardizedPhone
      };
    }

    // Show progressive hints for incomplete input
    if (cleanPhone.length < 10 && cleanPhone.startsWith('0')) {
      return {
        isValid: null,
        message: `Nhập thêm ${10 - cleanPhone.length} chữ số`,
        showError: false
      };
    }

    if (cleanPhone.length < 12 && cleanPhone.startsWith('+84')) {
      return {
        isValid: null,
        message: `Nhập thêm ${12 - cleanPhone.length} chữ số`,
        showError: false
      };
    }

    return {
      isValid: false,
      message: result.error,
      showError: true,
      suggestions: this.getErrorSuggestions(result.errorCode)
    };
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhoneValidator;
} else if (typeof window !== 'undefined') {
  window.PhoneValidator = PhoneValidator;
}