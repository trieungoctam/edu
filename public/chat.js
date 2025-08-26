/**
 * HSU Chatbot Frontend
 * Handles chat interface, state management, and API communication
 */

class ChatInterface {
    constructor() {
        this.sessionId = null;
        this.isTyping = false;
        this.messages = [];
        this.currentState = 'welcome';
        this.phoneValidator = new PhoneValidator();
        
        // DOM elements
        this.messagesContainer = document.getElementById('messages-container');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.quickRepliesContainer = document.getElementById('quick-replies');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.validationMessage = document.getElementById('validation-message');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startNewSession();
    }
    
    setupEventListeners() {
        // Form submission handling
        const form = document.querySelector('.input-wrapper');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Send button click
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Enhanced keyboard navigation
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Escape') {
                // Clear input on Escape
                this.messageInput.value = '';
                this.sendButton.disabled = true;
                this.hideValidationMessage();
            } else if (e.key === 'ArrowUp' && this.messages.length > 0) {
                // Navigate to last user message for editing
                const lastUserMessage = this.messages.filter(m => m.role === 'user').pop();
                if (lastUserMessage && this.messageInput.value.trim() === '') {
                    this.messageInput.value = lastUserMessage.content;
                    this.sendButton.disabled = false;
                }
            }
        });
        
        // Input validation for send button state and real-time phone validation
        this.messageInput.addEventListener('input', () => {
            const hasText = this.messageInput.value.trim().length > 0;
            this.sendButton.disabled = !hasText || this.isTyping;
            
            // Update ARIA attributes
            this.sendButton.setAttribute('aria-disabled', this.sendButton.disabled);
            
            // Real-time phone validation when in phone state
            if (this.currentState === 'phone') {
                this.validatePhoneRealTime();
            }
        });
        
        // Focus management for accessibility
        this.messageInput.addEventListener('focus', () => {
            this.scrollToBottom();
            this.announceToScreenReader('Đã focus vào ô nhập tin nhắn');
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M to focus message input
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                this.messageInput.focus();
                this.announceToScreenReader('Đã chuyển focus đến ô nhập tin nhắn');
            }
            
            // Alt + Q to focus first quick reply button
            if (e.altKey && e.key === 'q') {
                e.preventDefault();
                const firstQuickReply = document.querySelector('.quick-reply-button');
                if (firstQuickReply) {
                    firstQuickReply.focus();
                    this.announceToScreenReader('Đã chuyển focus đến các lựa chọn trả lời nhanh');
                }
            }
        });
        
        // Handle visibility changes for screen reader announcements
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.announceToScreenReader('Đã quay lại trang trò chuyện');
            }
        });
    }
    
    async startNewSession() {
        try {
            const response = await fetch('/api/chat/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: 'Bạn' // Default name, will be updated if user provides
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create session');
            }
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            
            // Show welcome message
            this.addMessage('assistant', data.welcomeMessage || 'Chào bạn! Mình là chatbot tư vấn tuyển sinh của Đại học Hoa Sen. Mình có thể giúp gì cho bạn?');
            
            if (data.quickReplies) {
                this.showQuickReplies(data.quickReplies);
            }
            
        } catch (error) {
            console.error('Error starting session:', error);
            this.addMessage('assistant', 'Xin lỗi, có lỗi xảy ra khi khởi tạo phiên trò chuyện. Vui lòng thử lại sau.');
        }
    }
    
    async sendMessage(text = null) {
        const messageText = text || this.messageInput.value.trim();
        
        if (!messageText || this.isTyping) return;
        
        // Pre-validate message (especially for phone numbers)
        const preValidation = this.preValidateMessage(messageText);
        if (!preValidation.isValid) {
            this.showValidationMessage({
                isValid: false,
                message: preValidation.error,
                showError: true,
                suggestions: preValidation.suggestions
            });
            return;
        }
        
        // Clear input and disable send button
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.hideQuickReplies();
        this.hideValidationMessage();
        
        // Add user message to chat (use formatted version for phone numbers)
        const displayText = preValidation.formattedPhone || messageText;
        this.addMessage('user', displayText);
        
        // Show typing indicator
        this.showTyping();
        
        try {
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    message: messageText
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const data = await response.json();
            
            // Simulate typing delay for better UX
            await this.delay(1000 + Math.random() * 1000);
            
            this.hideTyping();
            
            // Add bot response (support multiple replies)
            if (Array.isArray(data.replies) && data.replies.length > 0) {
                data.replies.forEach((r, idx) => {
                    this.addMessage('assistant', r);
                });
            } else if (data.reply) {
                this.addMessage('assistant', data.reply);
            } else if (data.message) {
                // backward compatibility
                this.addMessage('assistant', data.message);
            }
            
            // Update current state
            if (data.nextState) {
                this.currentState = data.nextState;
                this.updateInputAreaForState(data.nextState);
            }
            
            // Show quick replies if available (attach to last assistant message visually)
            if (data.quickReplies && data.quickReplies.length > 0) {
                this.showQuickReplies(data.quickReplies);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTyping();
            this.addMessage('assistant', 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }
    
    addMessage(role, content) {
        const messageElement = this.createMessageBubble(role, content);
        this.messagesContainer.appendChild(messageElement);
        
        // Store message in local state
        this.messages.push({
            role,
            content,
            timestamp: new Date()
        });
        
        // Scroll to bottom with smooth animation
        this.scrollToBottom();
    }
    
    createMessageBubble(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${role}`;
        
        // Enhanced ARIA attributes for screen readers
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', `${role === 'user' ? 'Tin nhắn của bạn' : 'Tin nhắn từ chatbot'}: ${content}`);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        contentDiv.setAttribute('aria-label', content);
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        const timestamp = this.formatTimestamp(new Date());
        timestampDiv.textContent = timestamp;
        timestampDiv.setAttribute('aria-label', `Thời gian: ${timestamp}`);
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestampDiv);
        
        // Announce new messages to screen readers
        setTimeout(() => {
            this.announceToScreenReader(`${role === 'user' ? 'Bạn đã gửi' : 'Chatbot trả lời'}: ${content}`);
        }, 100);
        
        return messageDiv;
    }
    
    showQuickReplies(replies) {
        this.quickRepliesContainer.innerHTML = '';
        
        replies.forEach((reply, index) => {
            const button = document.createElement('button');
            button.className = 'quick-reply-button';
            button.textContent = reply;
            button.setAttribute('aria-label', `Lựa chọn ${index + 1} trong ${replies.length}: ${reply}`);
            button.setAttribute('aria-describedby', 'quick-replies-help');
            button.setAttribute('tabindex', '0');
            
            button.addEventListener('click', () => {
                this.sendMessage(reply);
                this.announceToScreenReader(`Đã chọn: ${reply}`);
            });
            
            // Enhanced keyboard navigation
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.sendMessage(reply);
                    this.announceToScreenReader(`Đã chọn: ${reply}`);
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextButton = button.nextElementSibling;
                    if (nextButton) {
                        nextButton.focus();
                    } else {
                        // Wrap to first button
                        this.quickRepliesContainer.firstElementChild.focus();
                    }
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevButton = button.previousElementSibling;
                    if (prevButton) {
                        prevButton.focus();
                    } else {
                        // Wrap to last button
                        this.quickRepliesContainer.lastElementChild.focus();
                    }
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    this.quickRepliesContainer.firstElementChild.focus();
                } else if (e.key === 'End') {
                    e.preventDefault();
                    this.quickRepliesContainer.lastElementChild.focus();
                }
            });
            
            this.quickRepliesContainer.appendChild(button);
        });
        
        // Add help text for screen readers
        if (!document.getElementById('quick-replies-help')) {
            const helpText = document.createElement('div');
            helpText.id = 'quick-replies-help';
            helpText.className = 'sr-only';
            helpText.textContent = 'Sử dụng phím mũi tên để di chuyển giữa các lựa chọn, Enter hoặc Space để chọn';
            this.quickRepliesContainer.appendChild(helpText);
        }
        
        this.quickRepliesContainer.style.display = 'flex';
        this.scrollToBottom();
        
        // Announce availability of quick replies
        this.announceToScreenReader(`Có ${replies.length} lựa chọn trả lời nhanh. Nhấn Alt+Q để chuyển đến các lựa chọn.`);
    }
    
    hideQuickReplies() {
        this.quickRepliesContainer.style.display = 'none';
        this.quickRepliesContainer.innerHTML = '';
    }
    
    showTyping() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'flex';
        this.sendButton.disabled = true;
        this.sendButton.setAttribute('aria-disabled', 'true');
        this.scrollToBottom();
        
        // Announce typing to screen readers
        this.announceToScreenReader('Chatbot đang soạn tin nhắn');
    }
    
    hideTyping() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
        
        // Re-enable send button if there's text
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText;
        this.sendButton.setAttribute('aria-disabled', this.sendButton.disabled);
    }
    
    scrollToBottom() {
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }
    
    formatTimestamp(date) {
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Real-time phone number validation
     */
    validatePhoneRealTime() {
        const phoneInput = this.messageInput.value.trim();
        const validationResult = this.phoneValidator.validateRealTime(phoneInput);
        
        this.showValidationMessage(validationResult);
        this.updateInputStyling(validationResult);
        
        // Update send button state based on validation
        if (validationResult.isValid === false && validationResult.showError) {
            this.sendButton.disabled = true;
        } else if (validationResult.isValid === true) {
            this.sendButton.disabled = false;
        }
    }
    
    /**
     * Update input field styling based on validation result
     * @param {Object} validationResult - Validation result
     */
    updateInputStyling(validationResult) {
        // Remove existing validation classes
        this.messageInput.classList.remove('valid', 'error');
        
        // Add appropriate class based on validation state
        if (validationResult.isValid === true) {
            this.messageInput.classList.add('valid');
        } else if (validationResult.isValid === false && validationResult.showError) {
            this.messageInput.classList.add('error');
        }
    }
    
    /**
     * Show validation message to user
     * @param {Object} validationResult - Validation result from phone validator
     */
    showValidationMessage(validationResult) {
        if (!this.validationMessage) {
            // Create validation message element if it doesn't exist
            this.validationMessage = document.createElement('div');
            this.validationMessage.id = 'validation-message';
            this.validationMessage.className = 'validation-message';
            this.messageInput.parentNode.insertBefore(this.validationMessage, this.messageInput.nextSibling);
        }
        
        this.validationMessage.innerHTML = '';
        
        if (validationResult.message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `validation-text ${validationResult.isValid === true ? 'valid' : validationResult.showError ? 'error' : 'neutral'}`;
            messageDiv.textContent = validationResult.message;
            this.validationMessage.appendChild(messageDiv);
            
            // Show suggestions for errors
            if (validationResult.suggestions && validationResult.suggestions.length > 0) {
                const suggestionsDiv = document.createElement('div');
                suggestionsDiv.className = 'validation-suggestions';
                
                validationResult.suggestions.forEach(suggestion => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.textContent = `• ${suggestion}`;
                    suggestionsDiv.appendChild(suggestionItem);
                });
                
                this.validationMessage.appendChild(suggestionsDiv);
            }
            
            this.validationMessage.style.display = 'block';
        } else {
            this.validationMessage.style.display = 'none';
        }
    }
    
    /**
     * Hide validation message
     */
    hideValidationMessage() {
        if (this.validationMessage) {
            this.validationMessage.style.display = 'none';
        }
    }
    
    /**
     * Pre-validate message before sending (especially for phone numbers)
     * @param {string} messageText - Message to validate
     * @returns {Object} Validation result
     */
    preValidateMessage(messageText) {
        if (this.currentState === 'phone') {
            const phoneValidation = this.phoneValidator.validate(messageText);
            if (!phoneValidation.isValid) {
                return {
                    isValid: false,
                    error: phoneValidation.error,
                    suggestions: this.phoneValidator.getErrorSuggestions(phoneValidation.errorCode)
                };
            }
            return {
                isValid: true,
                formattedPhone: this.phoneValidator.formatPhone(messageText, 'display')
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * Update input area styling based on current conversation state
     * @param {string} state - Current conversation state
     */
    updateInputAreaForState(state) {
        const inputArea = document.querySelector('.input-area');
        const messageInput = this.messageInput;
        
        // Remove all state classes
        inputArea.classList.remove('phone-input');
        messageInput.classList.remove('valid', 'error');
        
        // Add state-specific classes and update placeholder
        if (state === 'phone') {
            inputArea.classList.add('phone-input');
            messageInput.placeholder = 'Nhập số điện thoại (ví dụ: 0901234567)';
            messageInput.setAttribute('inputmode', 'tel');
            messageInput.setAttribute('pattern', '[0-9+\\s\\-\\(\\)\\.]*');
            messageInput.setAttribute('aria-label', 'Nhập số điện thoại của bạn');
            messageInput.setAttribute('aria-describedby', 'phone-input-help');
            
            // Add help text for phone input
            if (!document.getElementById('phone-input-help')) {
                const helpText = document.createElement('div');
                helpText.id = 'phone-input-help';
                helpText.className = 'sr-only';
                helpText.textContent = 'Nhập số điện thoại theo định dạng Việt Nam, ví dụ: 0901234567 hoặc +84901234567';
                messageInput.parentNode.appendChild(helpText);
            }
            
            this.announceToScreenReader('Vui lòng nhập số điện thoại của bạn');
        } else {
            messageInput.placeholder = 'Nhập tin nhắn của bạn...';
            messageInput.removeAttribute('inputmode');
            messageInput.removeAttribute('pattern');
            messageInput.setAttribute('aria-label', 'Nhập tin nhắn của bạn');
            messageInput.setAttribute('aria-describedby', 'input-help');
            
            // Remove phone-specific help text
            const phoneHelp = document.getElementById('phone-input-help');
            if (phoneHelp) {
                phoneHelp.remove();
            }
        }
        
        // Clear any existing validation messages when state changes
        this.hideValidationMessage();
    }
    
    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        const announcements = document.getElementById('announcements');
        if (announcements) {
            announcements.textContent = message;
            
            // Clear after announcement to allow repeated announcements
            setTimeout(() => {
                announcements.textContent = '';
            }, 1000);
        }
    }
}

// Session Management
class SessionManager {
    constructor() {
        this.sessionData = {
            sessionId: null,
            userData: {},
            messages: []
        };
    }
    
    updateUserData(key, value) {
        this.sessionData.userData[key] = value;
        this.saveToLocalStorage();
    }
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('hsu_chat_session', JSON.stringify(this.sessionData));
        } catch (error) {
            console.warn('Could not save session to localStorage:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('hsu_chat_session');
            if (saved) {
                this.sessionData = JSON.parse(saved);
                return true;
            }
        } catch (error) {
            console.warn('Could not load session from localStorage:', error);
        }
        return false;
    }
    
    clearSession() {
        this.sessionData = {
            sessionId: null,
            userData: {},
            messages: []
        };
        localStorage.removeItem('hsu_chat_session');
    }
}

// Enhanced Accessibility Manager
class AccessibilityManager {
    constructor() {
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupFocusManagement();
        this.setupAccessibilityShortcuts();
    }
    
    setupKeyboardNavigation() {
        // Enhanced tab navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const quickReplyButtons = document.querySelectorAll('.quick-reply-button');
                if (quickReplyButtons.length > 0) {
                    // Ensure proper tab order
                    quickReplyButtons.forEach((button, index) => {
                        button.tabIndex = 0; // All buttons should be tabbable
                    });
                }
            }
        });
        
        // Roving tabindex for quick reply buttons
        document.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('quick-reply-button')) {
                // Remove tabindex from all other quick reply buttons
                document.querySelectorAll('.quick-reply-button').forEach(btn => {
                    if (btn !== e.target) {
                        btn.tabIndex = -1;
                    }
                });
                e.target.tabIndex = 0;
            }
        });
    }
    
    setupScreenReaderSupport() {
        // Monitor for new messages and announce them
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Handle message bubbles
                            if (node.classList && node.classList.contains('message-bubble')) {
                                this.handleNewMessage(node);
                            }
                            
                            // Handle quick replies
                            if (node.classList && node.classList.contains('quick-replies-container')) {
                                this.handleQuickRepliesUpdate();
                            }
                            
                            // Handle typing indicator
                            if (node.classList && node.classList.contains('typing-indicator')) {
                                this.handleTypingIndicator(node);
                            }
                        }
                    });
                }
            });
        });
        
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            observer.observe(chatContainer, { 
                childList: true, 
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'aria-hidden']
            });
        }
    }
    
    setupFocusManagement() {
        // Manage focus when elements appear/disappear
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        
        // Trap focus within chat container
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const chatContainer = document.getElementById('chat-container');
                const focusableContent = chatContainer.querySelectorAll(focusableElements);
                const firstFocusableElement = focusableContent[0];
                const lastFocusableElement = focusableContent[focusableContent.length - 1];
                
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }
    
    setupAccessibilityShortcuts() {
        // Additional keyboard shortcuts for accessibility
        document.addEventListener('keydown', (e) => {
            // Ctrl + / or F1 for help
            if ((e.ctrlKey && e.key === '/') || e.key === 'F1') {
                e.preventDefault();
                this.showKeyboardShortcuts();
            }
            
            // Escape to close quick replies and focus input
            if (e.key === 'Escape') {
                const quickReplies = document.getElementById('quick-replies');
                if (quickReplies && quickReplies.style.display !== 'none') {
                    const messageInput = document.getElementById('message-input');
                    messageInput.focus();
                    this.announceToScreenReader('Đã đóng các lựa chọn trả lời nhanh và chuyển về ô nhập tin nhắn');
                }
            }
        });
    }
    
    handleNewMessage(messageElement) {
        const content = messageElement.querySelector('.message-content');
        const isUser = messageElement.classList.contains('user');
        
        if (content) {
            const messageText = content.textContent;
            const announcement = `${isUser ? 'Bạn đã gửi' : 'Chatbot trả lời'}: ${messageText}`;
            
            // Delay announcement to ensure proper reading order
            setTimeout(() => {
                this.announceToScreenReader(announcement);
            }, 200);
        }
    }
    
    handleQuickRepliesUpdate() {
        const quickReplies = document.querySelectorAll('.quick-reply-button');
        if (quickReplies.length > 0) {
            // Set up roving tabindex for quick replies
            quickReplies.forEach((button, index) => {
                button.tabIndex = index === 0 ? 0 : -1;
            });
            
            setTimeout(() => {
                this.announceToScreenReader(`Có ${quickReplies.length} lựa chọn trả lời nhanh. Nhấn Alt+Q để chuyển đến.`);
            }, 300);
        }
    }
    
    handleTypingIndicator(indicator) {
        if (indicator.style.display !== 'none') {
            this.announceToScreenReader('Chatbot đang soạn tin nhắn');
        }
    }
    
    announceToScreenReader(text) {
        const announcements = document.getElementById('announcements');
        if (announcements) {
            // Clear previous announcement
            announcements.textContent = '';
            
            // Add new announcement after a brief delay
            setTimeout(() => {
                announcements.textContent = text;
            }, 50);
            
            // Clear after announcement to allow repeated announcements
            setTimeout(() => {
                announcements.textContent = '';
            }, 3000);
        }
    }
    
    showKeyboardShortcuts() {
        const shortcuts = [
            'Alt + M: Chuyển đến ô nhập tin nhắn',
            'Alt + Q: Chuyển đến các lựa chọn trả lời nhanh',
            'Enter: Gửi tin nhắn',
            'Escape: Xóa nội dung ô nhập hoặc đóng lựa chọn',
            'Mũi tên lên: Lấy lại tin nhắn cuối cùng',
            'Tab: Di chuyển giữa các phần tử',
            'Ctrl + /: Hiển thị trợ giúp phím tắt'
        ];
        
        const helpText = 'Phím tắt có sẵn: ' + shortcuts.join(', ');
        this.announceToScreenReader(helpText);
        
        // Also log to console for developers
        console.log('Keyboard Shortcuts:', shortcuts);
    }
}

// Error handling
class ErrorHandler {
    static handleNetworkError(error) {
        console.error('Network error:', error);
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.';
    }
    
    static handleAPIError(error, response) {
        console.error('API error:', error);
        
        if (response && response.status === 429) {
            return 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ một chút rồi thử lại.';
        }
        
        if (response && response.status >= 500) {
            return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.';
        }
        
        return 'Có lỗi xảy ra. Vui lòng thử lại sau.';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for browser compatibility
    if (!window.fetch) {
        alert('Trình duyệt của bạn không được hỗ trợ. Vui lòng cập nhật trình duyệt.');
        return;
    }
    
    // Initialize components
    const sessionManager = new SessionManager();
    const accessibilityManager = new AccessibilityManager();
    const chatInterface = new ChatInterface();
    
    // Global error handling
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
    });
    
    // Expose for debugging in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.chatInterface = chatInterface;
        window.sessionManager = sessionManager;
    }
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}