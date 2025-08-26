/**
 * Frontend Integration Tests
 * Tests the chat interface functionality and responsive design
 */

const fs = require('fs');
const path = require('path');

describe('Frontend Chat Interface', () => {
  let htmlContent, cssContent, jsContent;
  
  beforeAll(() => {
    // Read the frontend files
    htmlContent = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
    cssContent = fs.readFileSync(path.join(__dirname, '../../public/styles.css'), 'utf8');
    jsContent = fs.readFileSync(path.join(__dirname, '../../public/chat.js'), 'utf8');
  });
  
  describe('HTML Structure', () => {
    test('should have proper semantic structure', () => {
      expect(htmlContent).toContain('chat-container');
      expect(htmlContent).toContain('messages-container');
      expect(htmlContent).toContain('quick-replies-container');
      expect(htmlContent).toContain('input-area');
      expect(htmlContent).toContain('typing-indicator');
    });
    
    test('should have accessibility attributes', () => {
      expect(htmlContent).toContain('aria-label');
      expect(htmlContent).toContain('lang="vi"');
      expect(jsContent).toContain('role');
    });
    
    test('should have proper meta tags for mobile', () => {
      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toContain('theme-color');
      expect(htmlContent).toContain('manifest.json');
    });
  });
  
  describe('CSS Responsive Design', () => {
    test('should have mobile-first breakpoints', () => {
      expect(cssContent).toContain('@media (min-width: 480px)');
      expect(cssContent).toContain('@media (min-width: 768px)');
      expect(cssContent).toContain('@media (min-width: 1024px)');
    });
    
    test('should have touch-friendly button sizes', () => {
      expect(cssContent).toContain('min-height: 44px');
      expect(cssContent).toContain('min-width: 44px');
    });
    
    test('should have accessibility features', () => {
      expect(cssContent).toContain('@media (prefers-contrast: high)');
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('focus-visible');
    });
    
    test('should have smooth animations', () => {
      expect(cssContent).toContain('@keyframes slideIn');
      expect(cssContent).toContain('@keyframes typingDot');
      expect(cssContent).toContain('scroll-behavior: smooth');
    });
  });
  
  describe('JavaScript Functionality', () => {
    test('should have ChatInterface class', () => {
      expect(jsContent).toContain('class ChatInterface');
      expect(jsContent).toContain('constructor()');
      expect(jsContent).toContain('init()');
    });
    
    test('should have session management', () => {
      expect(jsContent).toContain('class SessionManager');
      expect(jsContent).toContain('sessionId');
      expect(jsContent).toContain('localStorage');
    });
    
    test('should have accessibility support', () => {
      expect(jsContent).toContain('class AccessibilityManager');
      expect(jsContent).toContain('setupKeyboardNavigation');
      expect(jsContent).toContain('setupScreenReaderSupport');
      expect(jsContent).toContain('announceToScreenReader');
    });
    
    test('should have error handling', () => {
      expect(jsContent).toContain('class ErrorHandler');
      expect(jsContent).toContain('handleNetworkError');
      expect(jsContent).toContain('handleAPIError');
    });
    
    test('should have proper API endpoints', () => {
      expect(jsContent).toContain('/api/chat/session');
      expect(jsContent).toContain('/api/chat/message');
      expect(jsContent).toContain('POST');
      expect(jsContent).toContain('method');
    });
  });
  
  describe('Component Structure', () => {
    test('should have message bubble creation', () => {
      expect(jsContent).toContain('createMessageBubble');
      expect(jsContent).toContain('message-bubble');
      expect(jsContent).toContain('message-content');
      expect(jsContent).toContain('message-timestamp');
    });
    
    test('should have quick reply functionality', () => {
      expect(jsContent).toContain('showQuickReplies');
      expect(jsContent).toContain('hideQuickReplies');
      expect(jsContent).toContain('quick-reply-button');
    });
    
    test('should have typing indicator', () => {
      expect(jsContent).toContain('showTyping');
      expect(jsContent).toContain('hideTyping');
      expect(jsContent).toContain('isTyping');
    });
    
    test('should have smooth scrolling', () => {
      expect(jsContent).toContain('scrollToBottom');
      expect(jsContent).toContain('requestAnimationFrame');
    });
  });
});

describe('File Structure', () => {
  test('should have all required frontend files', () => {
    const publicDir = path.join(__dirname, '../../public');
    
    expect(fs.existsSync(path.join(publicDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'styles.css'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'chat.js'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'sw.js'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'manifest.json'))).toBe(true);
  });
});

describe('Requirements Compliance', () => {
  let htmlContent, cssContent, jsContent;
  
  beforeAll(() => {
    htmlContent = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
    cssContent = fs.readFileSync(path.join(__dirname, '../../public/styles.css'), 'utf8');
    jsContent = fs.readFileSync(path.join(__dirname, '../../public/chat.js'), 'utf8');
  });
  
  test('should meet Requirement 8.1 - Mobile responsive design', () => {
    expect(cssContent).toContain('@media (min-width: 480px)');
    expect(cssContent).toContain('@media (min-width: 768px)');
    expect(cssContent).toContain('@media (min-width: 1024px)');
  });
  
  test('should meet Requirement 8.2 - Touch-friendly buttons', () => {
    expect(cssContent).toContain('min-height: 44px');
    expect(cssContent).toContain('min-width: 44px');
  });
  
  test('should meet Requirement 8.3 - Smooth scrolling animations', () => {
    expect(cssContent).toContain('scroll-behavior: smooth');
    expect(cssContent).toContain('@keyframes slideIn');
    expect(jsContent).toContain('requestAnimationFrame');
  });
});