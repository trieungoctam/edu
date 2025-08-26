/**
 * ConversationFlow - Manages the chatbot conversation state machine
 * Handles state transitions, message templating, and validation
 */

const PhoneValidator = require('../utils/phoneValidation');

class ConversationFlow {
  constructor() {
    this.phoneValidator = new PhoneValidator();
    this.states = {
      welcome: {
        message: "Chào {{first_name}} 👋 Chào mừng bạn đến với Đại học Hoa Sen! Bạn muốn nhận lộ trình học – học phí – học bổng cho ngành mình quan tâm chứ?",
        quickReplies: ['Có, mình quan tâm', 'Xem ngành đào tạo', 'Nói chuyện với người thật'],
        nextStates: ['major'],
        requiresInput: true
      },
      major: {
        message: "Bạn đang quan tâm ngành nào của HSU?",
        quickReplies: ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'],
        nextStates: ['phone', 'major_other'],
        requiresInput: true,
        validation: this.validateMajorSelection.bind(this)
      },
      major_other: {
        message: "Bạn gõ tên ngành giúp mình nhé.",
        quickReplies: [],
        nextStates: ['phone'],
        requiresInput: true,
        validation: this.validateCustomMajor.bind(this)
      },
      phone: {
        message: "Để gửi brochure + học phí + suất học bổng phù hợp và sắp lịch tư vấn 1-1, mình xin số điện thoại của bạn được không? 📱\n\nHSU chỉ dùng số này để tư vấn tuyển sinh, không spam.",
        quickReplies: [],
        nextStates: ['channel'],
        requiresInput: true,
        validation: this.validatePhone.bind(this),
        errorMessage: "Hình như số chưa đúng 😅. Bạn nhập theo dạng 0xxxxxxxxx hoặc +84xxxxxxxxx giúp mình nhé."
      },
      channel: {
        message: "Cảm ơn bạn! Mình đã ghi nhận số {{phone_standardized}}. Bạn muốn tư vấn qua Gọi hay Zalo?",
        quickReplies: ['Gọi điện', 'Zalo', 'Email'],
        nextStates: ['timeslot'],
        requiresInput: true,
        validation: this.validateChannel.bind(this)
      },
      timeslot: {
        message: "Bạn muốn được liên hệ lúc nào thuận tiện nhất?",
        quickReplies: ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'],
        nextStates: ['complete', 'custom_time'],
        requiresInput: true,
        validation: this.validateTimeslot.bind(this)
      },
      custom_time: {
        message: "Bạn gõ khung giờ thuận tiện giúp mình nhé (ví dụ: Sáng mai 9h, Chiều thứ 3...)",
        quickReplies: [],
        nextStates: ['complete'],
        requiresInput: true,
        validation: this.validateCustomTime.bind(this)
      },
      complete: {
        message: "Tuyệt vời! Mình đã xếp lịch {{timeslot}} cho bạn qua {{channel}}. Tư vấn viên của HSU sẽ liên hệ để gửi brochure, học phí & thông tin học bổng ngành {{major}}.\n\nCảm ơn {{first_name}} đã tin tưởng HSU! 🎓",
        quickReplies: [],
        nextStates: [],
        requiresInput: false
      },
      nudge: {
        message: "Bạn còn muốn nhận brochure + học bổng ngành {{major}} không? Mình có thể giữ suất tư vấn cho bạn ngay hôm nay.",
        quickReplies: ['Có, giữ giúp mình', 'Để sau'],
        nextStates: ['complete'],
        requiresInput: true,
        validation: this.validateNudgeResponse.bind(this)
      }
    };
  }

  /**
   * Get the current state configuration
   * @param {string} stateName - Name of the state
   * @returns {Object} State configuration
   */
  getState(stateName) {
    return this.states[stateName] || null;
  }

  /**
   * Process user input and determine next state
   * @param {string} currentState - Current conversation state
   * @param {string} userInput - User's message
   * @param {Object} userData - Current user data
   * @returns {Object} Processing result with next state, validation, etc.
   */
  processInput(currentState, userInput, userData = {}) {
    const state = this.getState(currentState);

    if (!state) {
      return {
        success: false,
        error: 'Invalid state',
        nextState: 'welcome'
      };
    }

    // Validate input if validation function exists
    if (state.validation) {
      const validationResult = state.validation(userInput, userData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: validationResult.errorCode,
          message: state.errorMessage || validationResult.error,
          nextState: currentState, // Stay in current state
          retryCount: (userData.retryCount || 0) + 1
        };
      }

      // Update userData with validated/processed input
      if (validationResult.processedData) {
        Object.assign(userData, validationResult.processedData);
      }
    }

    // Determine next state based on input and current state
    const nextState = this.determineNextState(currentState, userInput, userData);

    return {
      success: true,
      nextState: nextState,
      userData: userData,
      processedInput: userInput
    };
  }

  /**
   * Determine the next state based on current state and user input
   * @param {string} currentState - Current state
   * @param {string} userInput - User input
   * @param {Object} userData - User data
   * @returns {string} Next state name
   */
  determineNextState(currentState, userInput, userData) {
    const state = this.getState(currentState);

    switch (currentState) {
      case 'welcome':
        return 'major';

      case 'major':
        if (userInput.toLowerCase().includes('khác') || userInput === 'Khác') {
          return 'major_other';
        }
        return 'phone';

      case 'major_other':
        return 'phone';

      case 'phone':
        return 'channel';

      case 'channel':
        return 'timeslot';

      case 'timeslot':
        if (userInput === 'Chọn giờ khác') {
          return 'custom_time';
        }
        return 'complete';

      case 'custom_time':
        return 'complete';

      case 'nudge':
        if (userInput.toLowerCase().includes('có') || userInput === 'Có, giữ giúp mình') {
          return 'complete';
        }
        return 'complete'; // End conversation regardless

      default:
        return 'complete';
    }
  }

  /**
   * Generate message with template variables replaced
   * @param {string} stateName - State name
   * @param {Object} userData - User data for template replacement
   * @returns {string} Formatted message
   */
  generateMessage(stateName, userData = {}) {
    const state = this.getState(stateName);
    if (!state) {
      return "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.";
    }

    return this.replaceTemplateVariables(state.message, userData);
  }

  /**
   * Get short informational blurb for a given major
   * @param {string} major
   * @returns {string}
   */
  getMajorInfo(major = '') {
    const key = (major || '').toLowerCase();
    const infoMap = {
      'quản trị kinh doanh':
        'Ngành Quản trị Kinh doanh giúp bạn nắm nền tảng quản trị, marketing, tài chính và khởi nghiệp. Cơ hội nghề nghiệp: quản lý, kinh doanh, thương mại, startup. HSU chú trọng thực hành – dự án doanh nghiệp – mentor từ doanh nhân.',
      'cntt':
        'Ngành Công nghệ Thông tin (CNTT) trang bị kỹ năng lập trình, web/app, dữ liệu và hệ thống. Hướng phát triển: Software Engineer, Backend/Frontend, QA, DevOps, Data. HSU chú trọng dự án thật – kỹ năng mềm – tuyển thực tập sớm.',
      'công nghệ thông tin':
        'Ngành Công nghệ Thông tin (CNTT) trang bị kỹ năng lập trình, web/app, dữ liệu và hệ thống. Hướng phát triển: Software Engineer, Backend/Frontend, QA, DevOps, Data. HSU chú trọng dự án thật – kỹ năng mềm – tuyển thực tập sớm.',
      'thiết kế':
        'Ngành Thiết kế giúp phát triển tư duy thẩm mỹ và kỹ năng đồ họa, UI/UX, branding, illustration. Lộ trình hướng nghề: Designer, Art/Creative, UI/UX. HSU chú trọng portfolio dự án – workshop – kết nối studio.',
      'ngôn ngữ':
        'Khối ngành Ngôn ngữ (Anh, Trung, Nhật, Hàn…) chú trọng năng lực giao tiếp, biên – phiên dịch, thương mại. Cơ hội: doanh nghiệp FDI, du lịch – dịch vụ, giáo dục, truyền thông.',
      'truyền thông':
        'Ngành Truyền thông đào tạo content, PR, digital, media production. Nghề nghiệp: Content/PR/Digital Executive, Producer, Social Specialist. HSU có nhiều dự án thực tế với nhãn hàng.',
    };

    // Match known keys or return generic message
    const matchedKey = Object.keys(infoMap).find(k => key.includes(k));
    if (matchedKey) return infoMap[matchedKey];

    if (major && major.trim().length > 0) {
      return `Ngành ${major} đang được nhiều bạn quan tâm. HSU sẽ tư vấn lộ trình học, học phí và học bổng phù hợp để bạn dễ lựa chọn.`;
    }
    return 'HSU có các khối ngành mũi nhọn: Quản trị Kinh doanh, CNTT, Thiết kế, Ngôn ngữ, Truyền thông. HSU chú trọng thực hành – dự án – kết nối doanh nghiệp.';
  }

  /**
   * Replace template variables in message
   * @param {string} message - Message template
   * @param {Object} userData - Data for replacement
   * @returns {string} Message with variables replaced
   */
  replaceTemplateVariables(message, userData) {
    return message.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return userData[variable] || match;
    });
  }

  // Validation Functions

  /**
   * Validate major selection
   * @param {string} input - User input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validateMajorSelection(input, userData) {
    const validMajors = [
      'Quản trị Kinh doanh', 'CNTT', 'Thiết kế',
      'Ngôn ngữ', 'Truyền thông', 'Khác'
    ];

    if (validMajors.includes(input) || input.trim().length > 0) {
      return {
        isValid: true,
        processedData: { major: input }
      };
    }

    return {
      isValid: false,
      error: "Vui lòng chọn một ngành học hợp lệ."
    };
  }

  /**
   * Validate custom major input
   * @param {string} input - User input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validateCustomMajor(input, userData) {
    const trimmedInput = input.trim();

    if (trimmedInput.length >= 2 && trimmedInput.length <= 100) {
      return {
        isValid: true,
        processedData: { major: trimmedInput }
      };
    }

    return {
      isValid: false,
      error: "Vui lòng nhập tên ngành (từ 2-100 ký tự)."
    };
  }

  /**
   * Validate Vietnamese phone number formats using enhanced validator
   * @param {string} phone - Phone number input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validatePhone(phone, userData) {
    const validationResult = this.phoneValidator.validate(phone);

    if (validationResult.isValid) {
      return {
        isValid: true,
        processedData: {
          phone: validationResult.originalPhone,
          phone_clean: validationResult.cleanPhone,
          phone_standardized: validationResult.standardizedPhone,
          phone_network: validationResult.network
        }
      };
    }

    return {
      isValid: false,
      error: validationResult.error,
      errorCode: validationResult.errorCode
    };
  }

  /**
   * Validate communication channel selection
   * @param {string} input - User input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validateChannel(input, userData) {
    const validChannels = ['Gọi điện', 'Zalo', 'Email'];

    if (validChannels.includes(input)) {
      return {
        isValid: true,
        processedData: { channel: input }
      };
    }

    return {
      isValid: false,
      error: "Vui lòng chọn một kênh liên hệ hợp lệ: Gọi điện, Zalo, hoặc Email."
    };
  }

  /**
   * Validate timeslot selection
   * @param {string} input - User input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validateTimeslot(input, userData) {
    const validTimeslots = [
      'Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'
    ];

    if (validTimeslots.includes(input)) {
      return {
        isValid: true,
        processedData: { timeslot: input }
      };
    }

    return {
      isValid: false,
      error: "Vui lòng chọn một khung thời gian hợp lệ."
    };
  }

  /**
   * Validate custom time input
   * @param {string} input - User input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validateCustomTime(input, userData) {
    const trimmedInput = input.trim();

    if (trimmedInput.length >= 3 && trimmedInput.length <= 100) {
      return {
        isValid: true,
        processedData: { timeslot: trimmedInput }
      };
    }

    return {
      isValid: false,
      error: "Vui lòng nhập thời gian cụ thể (ví dụ: Sáng mai 9h, Chiều thứ 3...)."
    };
  }

  /**
   * Validate nudge response
   * @param {string} input - User input
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  validateNudgeResponse(input, userData) {
    const validResponses = ['Có, giữ giúp mình', 'Để sau'];

    if (validResponses.includes(input) || input.trim().length > 0) {
      return {
        isValid: true,
        processedData: { nudge_response: input }
      };
    }

    return {
      isValid: false,
      error: "Vui lòng chọn một phản hồi hợp lệ."
    };
  }

  /**
   * Check if conversation is complete
   * @param {string} stateName - Current state
   * @returns {boolean} True if conversation is complete
   */
  isConversationComplete(stateName) {
    return stateName === 'complete';
  }

  /**
   * Get quick replies for a state
   * @param {string} stateName - State name
   * @returns {Array} Array of quick reply options
   */
  getQuickReplies(stateName) {
    const state = this.getState(stateName);
    return state ? state.quickReplies : [];
  }

  /**
   * Handle error scenarios and provide appropriate responses
   * @param {string} currentState - Current state
   * @param {string} error - Error message
   * @param {number} retryCount - Number of retries
   * @returns {Object} Error handling result
   */
  handleError(currentState, error, retryCount = 0) {
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      return {
        message: "Mình gặp khó khăn trong việc xử lý thông tin. Bạn có thể thử lại hoặc liên hệ trực tiếp với HSU qua hotline 1900 6929.",
        nextState: 'welcome',
        shouldRestart: true
      };
    }

    const state = this.getState(currentState);
    return {
      message: state?.errorMessage || error,
      nextState: currentState,
      shouldRetry: true,
      retryCount: retryCount + 1
    };
  }
}

module.exports = ConversationFlow;