# Requirements Document

## Introduction

This document outlines the requirements for building a simplified chatbot system for Hoa Sen University's admission counseling. The chatbot will use Google Gemini AI to provide automated consultation services and collect basic student information. The system will be built using JavaScript full-stack technology with Node.js backend and responsive frontend, focusing on core conversation flow and lead collection without complex CRM integration.

## Requirements

### Requirement 1

**User Story:** As a prospective student, I want to interact with an intelligent chatbot that can guide me through the admission process, so that I can get personalized information about programs and schedule consultations.

#### Acceptance Criteria

1. WHEN a user visits the chatbot interface THEN the system SHALL display a welcome message introducing Hoa Sen University
2. WHEN a user sends a message THEN the system SHALL respond within 2 seconds using Gemini AI
3. WHEN a user goes off-topic THEN the system SHALL politely redirect them back to admission-related topics
4. WHEN a user is inactive for 2 minutes THEN the system SHALL send a nudge message to re-engage them

### Requirement 2

**User Story:** As a prospective student, I want to select my area of interest from available majors, so that I can receive targeted information and counseling.

#### Acceptance Criteria

1. WHEN the chatbot asks about major interest THEN the system SHALL provide quick reply buttons for main categories: 'Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'
2. WHEN a user selects 'Khác' THEN the system SHALL allow free text input for custom major specification
3. WHEN a user selects a major category THEN the system SHALL store this information in the session data
4. WHEN major selection is complete THEN the system SHALL proceed to contact information collection

### Requirement 3

**User Story:** As a prospective student, I want to provide my contact information securely, so that the university can send me relevant materials and schedule consultations.

#### Acceptance Criteria

1. WHEN the system requests phone number THEN it SHALL validate the format using Vietnamese phone number patterns (0xxxxxxxxx or +84xxxxxxxxx)
2. WHEN an invalid phone number is entered THEN the system SHALL display a friendly error message and request correct format
3. WHEN a valid phone number is provided THEN the system SHALL standardize it to 0xxxxxxxxx format
4. WHEN phone validation succeeds THEN the system SHALL proceed to communication channel selection
5. WHEN collecting contact information THEN the system SHALL encrypt sensitive data before storage

### Requirement 4

**User Story:** As a prospective student, I want to choose my preferred communication method and timing, so that I can be contacted at my convenience.

#### Acceptance Criteria

1. WHEN phone number is validated THEN the system SHALL offer communication channels: 'Gọi điện', 'Zalo', 'Email'
2. WHEN communication channel is selected THEN the system SHALL offer time slots: 'Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'
3. WHEN 'Chọn giờ khác' is selected THEN the system SHALL allow free text input for custom timing
4. WHEN all preferences are collected THEN the system SHALL confirm the consultation booking

### Requirement 5

**User Story:** As an admission counselor, I want all lead information to be automatically captured and stored, so that I can follow up with prospective students effectively.

#### Acceptance Criteria

1. WHEN a conversation is completed THEN the system SHALL create a lead record with all collected information
2. WHEN a lead is created THEN the system SHALL store data in local database (MongoDB/PostgreSQL)
3. WHEN lead data is saved THEN the system SHALL log the completion for tracking purposes
4. WHEN lead generation occurs THEN the system SHALL assign a unique lead ID and timestamp

### Requirement 6

**User Story:** As an admission counselor, I want to access basic conversation data and lead information, so that I can follow up with prospective students.

#### Acceptance Criteria

1. WHEN accessing the admin interface THEN the system SHALL display basic metrics including total conversations and leads generated
2. WHEN viewing lead data THEN the system SHALL show collected information: name, major, phone, preferred contact method, and timing
3. WHEN reviewing conversations THEN the system SHALL provide simple lead export functionality
4. WHEN examining data THEN the system SHALL display leads in chronological order with timestamps

### Requirement 7

**User Story:** As a system administrator, I want the chatbot to handle basic concurrent usage reliably, so that prospective students receive consistent service.

#### Acceptance Criteria

1. WHEN multiple users access the system THEN it SHALL support at least 20 concurrent users
2. WHEN API calls are made THEN response times SHALL be under 3 seconds for chat responses
3. WHEN database operations occur THEN they SHALL complete within reasonable time for basic operations
4. WHEN excessive requests occur THEN the system SHALL implement basic rate limiting protection

### Requirement 8

**User Story:** As a mobile user, I want the chatbot interface to work seamlessly on my smartphone, so that I can access admission information anywhere.

#### Acceptance Criteria

1. WHEN accessing on mobile devices THEN the interface SHALL be fully responsive with mobile-first design
2. WHEN using touch interface THEN buttons SHALL be at least 44px for touch-friendly interaction
3. WHEN viewing on different screen sizes THEN the layout SHALL adapt to breakpoints: 480px, 768px, 1024px
4. WHEN scrolling through conversation THEN the interface SHALL provide smooth scrolling animations

### Requirement 9

**User Story:** As a user with accessibility needs, I want the chatbot to be accessible through screen readers and keyboard navigation, so that I can access admission information regardless of my abilities.

#### Acceptance Criteria

1. WHEN using screen readers THEN all interface elements SHALL have appropriate ARIA labels
2. WHEN navigating with keyboard THEN all interactive elements SHALL be accessible via keyboard shortcuts
3. WHEN viewing in high contrast mode THEN the interface SHALL maintain readability
4. WHEN adjusting font size THEN the interface SHALL scale appropriately

### Requirement 10

**User Story:** As a system administrator, I want basic security measures in place to protect student data, so that personal information is handled safely.

#### Acceptance Criteria

1. WHEN storing contact information THEN the system SHALL implement basic data protection measures
2. WHEN processing user input THEN the system SHALL sanitize inputs to prevent basic security issues
3. WHEN storing API keys THEN they SHALL be kept in environment variables, not in code
4. WHEN sessions are inactive THEN they SHALL be cleaned up periodically to prevent data accumulation