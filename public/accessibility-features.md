# Accessibility Features - HSU Chatbot

This document outlines the accessibility features implemented in the HSU Chatbot interface to ensure compliance with web accessibility standards and provide an inclusive user experience.

## 🎯 Requirements Compliance

### Requirement 9.1 - ARIA Labels for Interactive Elements
✅ **Implemented**
- All buttons have descriptive `aria-label` attributes
- Form inputs have proper labels and descriptions
- Interactive elements include role attributes
- Quick reply buttons have contextual labels with position information
- Message bubbles have appropriate article roles

### Requirement 9.2 - Keyboard Navigation Support  
✅ **Implemented**
- Full keyboard navigation with Tab, Arrow keys, Home, End
- Roving tabindex for quick reply buttons
- Keyboard shortcuts: Alt+M (focus input), Alt+Q (focus quick replies)
- Enter/Space activation for buttons
- Escape key for clearing input and closing dialogs
- Focus trapping within the chat container

### Requirement 9.3 - High Contrast Mode Compatibility
✅ **Implemented**
- CSS media query for `prefers-contrast: high`
- Enhanced border widths (3px) in high contrast mode
- Improved color contrast ratios
- Proper focus indicators with high contrast support
- Dark mode support with `prefers-color-scheme: dark`

### Requirement 9.4 - Interface Scalability for Font Sizes
✅ **Implemented**
- Relative font sizing using `rem` and `em` units
- Respects user's browser font size preferences
- Scalable layout that adapts to different font sizes
- Proper line-height (1.5) for better readability
- Responsive design that works with font scaling

## 🔧 Technical Implementation

### HTML Accessibility Features
- **Semantic HTML**: Uses proper `<main>`, `<header>`, `<section>`, `<nav>` elements
- **ARIA Landmarks**: Clear page structure with role attributes
- **Live Regions**: `aria-live` for dynamic content announcements
- **Form Labels**: Proper `<label>` elements and `aria-describedby`
- **Skip Links**: Keyboard navigation shortcuts
- **Language Declaration**: `lang="vi"` for Vietnamese content

### CSS Accessibility Features
- **Screen Reader Support**: `.sr-only` class for screen reader only content
- **Focus Indicators**: Enhanced focus outlines with proper contrast
- **Touch Targets**: Minimum 44px touch target sizes
- **Motion Preferences**: Respects `prefers-reduced-motion`
- **Contrast Support**: High contrast and dark mode media queries
- **Font Scaling**: Relative units that scale with user preferences

### JavaScript Accessibility Features
- **AccessibilityManager Class**: Centralized accessibility management
- **Keyboard Navigation**: Arrow key navigation for quick replies
- **Screen Reader Announcements**: Dynamic content announcements
- **Focus Management**: Proper focus handling and restoration
- **ARIA Updates**: Dynamic ARIA attribute management
- **Keyboard Shortcuts**: Global accessibility shortcuts

## 🎹 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + M` | Focus message input field |
| `Alt + Q` | Focus first quick reply button |
| `Enter` | Send message or activate button |
| `Escape` | Clear input or close quick replies |
| `↑` | Recall last user message |
| `→/↓` | Navigate to next quick reply |
| `←/↑` | Navigate to previous quick reply |
| `Home` | Focus first quick reply |
| `End` | Focus last quick reply |
| `Tab` | Navigate between focusable elements |
| `Ctrl + /` | Show keyboard shortcuts help |

## 📱 Screen Reader Support

### Announcements
- New messages are announced with sender identification
- Typing indicator status is announced
- Quick reply availability is announced
- Navigation changes are announced
- Validation messages are announced

### ARIA Labels
- Message bubbles: "Tin nhắn của bạn" / "Tin nhắn từ chatbot"
- Quick replies: "Lựa chọn X trong Y: [option text]"
- Input field: "Nhập tin nhắn của bạn"
- Send button: "Gửi tin nhắn"
- Typing indicator: "Chatbot đang soạn tin nhắn"

## 🎨 Visual Accessibility

### High Contrast Mode
- Increased border widths (3px)
- Enhanced color contrast ratios
- Proper focus indicators
- Clear visual hierarchy

### Dark Mode
- Automatic detection of user preference
- Proper contrast ratios maintained
- Consistent visual design
- Reduced eye strain in low light

### Font Scaling
- Supports browser zoom up to 200%
- Relative font sizing (rem/em units)
- Maintains layout integrity
- Proper line spacing (1.5)

## 🧪 Testing

### Automated Tests
- 30 accessibility tests covering all requirements
- HTML structure validation
- CSS accessibility features
- JavaScript accessibility functions
- Requirements compliance verification

### Manual Testing Recommendations
1. **Keyboard Navigation**: Test all functionality using only keyboard
2. **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
3. **High Contrast**: Test in Windows High Contrast mode
4. **Font Scaling**: Test with browser zoom at 150% and 200%
5. **Color Blindness**: Test with color blindness simulators

## 🔍 Browser Support

### Screen Readers
- ✅ NVDA (Windows)
- ✅ JAWS (Windows)  
- ✅ VoiceOver (macOS/iOS)
- ✅ TalkBack (Android)

### Browsers
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## 📋 Accessibility Checklist

- [x] Semantic HTML structure
- [x] ARIA labels and roles
- [x] Keyboard navigation
- [x] Focus management
- [x] Screen reader support
- [x] High contrast compatibility
- [x] Font scaling support
- [x] Touch target sizes (44px minimum)
- [x] Color contrast ratios
- [x] Motion preferences
- [x] Skip links
- [x] Form labels
- [x] Live regions
- [x] Error handling
- [x] Language declaration

## 🚀 Future Enhancements

1. **Voice Input**: Add speech recognition support
2. **Magnification**: Enhanced support for screen magnifiers
3. **Cognitive Accessibility**: Simplified language options
4. **Multi-language**: Extended language support
5. **Customization**: User preference settings for accessibility

---

*This accessibility implementation ensures the HSU Chatbot is usable by people with diverse abilities and assistive technologies.*