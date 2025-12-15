# Homework Check - Design Guidelines

## Design Approach
**System**: Material Design principles adapted for educational use
**Rationale**: Form-heavy educational tools require clarity, accessibility, and obvious feedback mechanisms. Material Design provides excellent patterns for data entry, validation states, and dashboard layouts.

## Core Design Elements

### Typography
- **Primary Font**: Noto Sans KR (Google Fonts) - optimal for Korean text readability
- **Hierarchy**:
  - Page titles: text-3xl font-bold (36px)
  - Section headers: text-xl font-semibold (20px)
  - Body text: text-base (16px)
  - Labels/hints: text-sm text-gray-600 (14px)
- **Line height**: Generous spacing (1.6-1.8) for Korean characters

### Layout System
- **Spacing primitives**: Use Tailwind units of 3, 4, 6, and 8 (p-3, m-4, gap-6, py-8)
- **Container**: max-w-2xl centered for forms, max-w-6xl for teacher dashboard
- **Grid**: Single column for student flow, 2-3 columns for dashboard tables

### Component Library

**Student Flow Pages**:
- **Name Entry Page**: Centered card (max-w-md) with welcome message, single input field, prominent submit button
- **Answer Submission**: Vertical form with numbered problem inputs (1-based indexing), each with clear label "문제 1", "문제 2", etc., grouped in cards with subtle borders
- **Results Page**: Two-section layout - score display at top (large, celebratory for high scores), detailed feedback list below showing incorrect problems with red indicators

**Teacher Dashboard**:
- **Answer Configuration**: Grid layout for entering correct answers, save/edit controls, clear visual confirmation of saved state
- **Student Results Table**: Sortable columns (이름/Name, 점수/Score, 제출 시간/Submission Time), row-based design with alternating backgrounds, expandable rows to view detailed answers
- **Authentication**: Simple centered login card with password field

**Form Elements**:
- Text inputs: Outlined style with focus states, floating labels, clear error messages in Korean
- Buttons: Elevated primary (blue), text secondary, generous padding (px-6 py-3)
- Validation: Inline error messages below fields, red accent for errors, green for success

**Feedback Components**:
- Correct answers: Green checkmark icon with "정답" badge
- Incorrect answers: Red X icon with "오답" badge, show student's answer vs correct answer
- Score display: Large circular progress indicator or percentage card

### Visual Feedback
- **Success states**: Subtle green background tint, checkmark icons
- **Error states**: Red text, outlined in red, exclamation icon
- **Loading states**: Simple spinner, disabled button states
- **Empty states**: Friendly illustration placeholder with helpful text

### Navigation
- Student pages: Linear progression (Name → Answers → Results), no back navigation during submission
- Teacher dashboard: Top navigation bar with "답안 설정" and "학생 결과" tabs, logout button
- Breadcrumbs: Not needed for simple flow

### Responsive Behavior
- Mobile-first: All forms stack vertically, full-width inputs on mobile
- Desktop: Forms remain max-w-2xl centered, dashboard uses available width
- Touch targets: Minimum 44px height for all interactive elements

## Images
**No hero images needed** - This is a functional educational tool. Focus remains on forms and data.

## Key Principles
1. **Clarity over creativity**: Students need obvious next steps
2. **Immediate feedback**: Visual confirmation for every action
3. **Error prevention**: Validation before submission, clear required fields
4. **Accessibility**: High contrast, Korean screen reader support, keyboard navigation
5. **No distractions**: Minimal animations, focus on content and task completion