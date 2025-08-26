/**
 * Accessibility Tests for HSU Chatbot
 * Tests ARIA labels, keyboard navigation, and screen reader support
 */

const fs = require('fs');
const path = require('path');

describe('Accessibility Features', () => {
    let htmlContent;
    let cssContent;
    let jsContent;

    beforeAll(() => {
        // Read the actual files
        htmlContent = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
        cssContent = fs.readFileSync(path.join(__dirname, '../../public/styles.css'), 'utf8');
        jsContent = fs.readFileSync(path.join(__dirname, '../../public/chat.js'), 'utf8');
    });

    describe('HTML Accessibility', () => {
        test('should have proper semantic HTML structure', () => {
            expect(htmlContent).toContain('<main');
            expect(htmlContent).toContain('role="main"');
            expect(htmlContent).toContain('<header');
            expect(htmlContent).toContain('role="banner"');
            expect(htmlContent).toContain('<section');
            expect(htmlContent).toContain('<nav');
        });

        test('should have proper ARIA labels', () => {
            expect(htmlContent).toContain('aria-label="Giao diện trò chuyện tư vấn tuyển sinh"');
            expect(htmlContent).toContain('aria-label="Lịch sử cuộc trò chuyện"');
            expect(htmlContent).toContain('aria-label="Các lựa chọn trả lời nhanh"');
            expect(htmlContent).toContain('aria-label="Khu vực nhập tin nhắn"');
        });

        test('should have proper live regions', () => {
            expect(htmlContent).toContain('aria-live="polite"');
            expect(htmlContent).toContain('aria-live="assertive"');
            expect(htmlContent).toContain('role="log"');
            expect(htmlContent).toContain('role="status"');
        });

        test('should have skip link for keyboard navigation', () => {
            expect(htmlContent).toContain('class="skip-link"');
            expect(htmlContent).toContain('href="#message-input"');
        });

        test('should have screen reader only content', () => {
            expect(htmlContent).toContain('class="sr-only"');
            expect(htmlContent).toContain('id="announcements"');
        });

        test('should have proper form structure', () => {
            expect(htmlContent).toContain('role="form"');
            expect(htmlContent).toContain('<label for="message-input"');
            expect(htmlContent).toContain('type="submit"');
        });

        test('should have proper image alt text', () => {
            expect(htmlContent).toContain('alt="Logo Đại học Hoa Sen"');
        });

        test('should have language attribute', () => {
            expect(htmlContent).toContain('lang="vi"');
        });
    });

    describe('CSS Accessibility', () => {
        test('should have screen reader only styles', () => {
            expect(cssContent).toContain('.sr-only');
            expect(cssContent).toContain('position: absolute');
            expect(cssContent).toContain('width: 1px');
            expect(cssContent).toContain('height: 1px');
        });

        test('should have skip link styles', () => {
            expect(cssContent).toContain('.skip-link');
            expect(cssContent).toContain('top: -40px');
            expect(cssContent).toContain('.skip-link:focus');
        });

        test('should have high contrast mode support', () => {
            expect(cssContent).toContain('@media (prefers-contrast: high)');
            expect(cssContent).toContain('border-width: 3px');
        });

        test('should have reduced motion support', () => {
            expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
            expect(cssContent).toContain('animation: none');
        });

        test('should have proper focus indicators', () => {
            expect(cssContent).toContain(':focus');
            expect(cssContent).toContain(':focus-visible');
            expect(cssContent).toContain('outline:');
            expect(cssContent).toContain('box-shadow:');
        });

        test('should have minimum touch target sizes', () => {
            expect(cssContent).toContain('min-height: 44px');
            expect(cssContent).toContain('min-width: 44px');
        });

        test('should support font scaling', () => {
            expect(cssContent).toContain('font-size: 100%');
            expect(cssContent).toContain('font-size: 1rem');
            expect(cssContent).toContain('line-height: 1.5');
        });

        test('should have dark mode support', () => {
            expect(cssContent).toContain('@media (prefers-color-scheme: dark)');
        });
    });

    describe('JavaScript Accessibility', () => {
        test('should have AccessibilityManager class', () => {
            expect(jsContent).toContain('class AccessibilityManager');
            expect(jsContent).toContain('setupKeyboardNavigation');
            expect(jsContent).toContain('setupScreenReaderSupport');
            expect(jsContent).toContain('setupFocusManagement');
        });

        test('should have keyboard event handlers', () => {
            expect(jsContent).toContain('keydown');
            expect(jsContent).toContain('ArrowRight');
            expect(jsContent).toContain('ArrowLeft');
            expect(jsContent).toContain('Home');
            expect(jsContent).toContain('End');
            expect(jsContent).toContain('Escape');
        });

        test('should have ARIA attribute management', () => {
            expect(jsContent).toContain('setAttribute(\'aria-');
            expect(jsContent).toContain('aria-label');
            expect(jsContent).toContain('aria-disabled');
            expect(jsContent).toContain('aria-describedby');
        });

        test('should have screen reader announcements', () => {
            expect(jsContent).toContain('announceToScreenReader');
            expect(jsContent).toContain('announcements');
        });

        test('should have keyboard shortcuts', () => {
            expect(jsContent).toContain('Alt + M');
            expect(jsContent).toContain('Alt + Q');
            expect(jsContent).toContain('setupAccessibilityShortcuts');
        });

        test('should have focus management', () => {
            expect(jsContent).toContain('focus()');
            expect(jsContent).toContain('tabIndex');
            expect(jsContent).toContain('focusableElements');
        });

        test('should have proper role attributes', () => {
            expect(jsContent).toContain('role');
            expect(jsContent).toContain('article');
        });
    });

    describe('Integration Tests', () => {
        test('should have consistent ARIA labeling between HTML and JS', () => {
            // Check that JS creates elements with proper ARIA labels
            expect(jsContent).toContain('aria-label');
            expect(htmlContent).toContain('aria-label');
        });

        test('should have proper form handling', () => {
            expect(jsContent).toContain('preventDefault()');
            expect(jsContent).toContain('submit');
            expect(htmlContent).toContain('type="submit"');
        });

        test('should have consistent keyboard navigation', () => {
            expect(jsContent).toContain('Tab');
            expect(cssContent).toContain(':focus');
        });
    });

    describe('Accessibility Requirements Compliance', () => {
        test('should meet Requirement 9.1 - ARIA labels for interactive elements', () => {
            expect(htmlContent).toContain('aria-label');
            expect(jsContent).toContain('setAttribute(\'aria-label\'');
        });

        test('should meet Requirement 9.2 - Keyboard navigation support', () => {
            expect(jsContent).toContain('keydown');
            expect(jsContent).toContain('ArrowRight');
            expect(jsContent).toContain('ArrowLeft');
            expect(jsContent).toContain('Tab');
        });

        test('should meet Requirement 9.3 - High contrast mode compatibility', () => {
            expect(cssContent).toContain('@media (prefers-contrast: high)');
        });

        test('should meet Requirement 9.4 - Interface scalability for font sizes', () => {
            expect(cssContent).toContain('font-size: 100%');
            expect(cssContent).toContain('font-size: 1rem');
            expect(cssContent).toContain('line-height: 1.5');
        });
    });
});