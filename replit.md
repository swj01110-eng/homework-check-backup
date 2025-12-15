# Homework Check System

## Overview
This project is a Korean-language educational web application designed for weekly homework management. It enables teachers to create classes, organize assignments into folders, and configure answer keys. Students can select their class and assignment to submit answers and receive instant feedback. The system enforces class-scoped assignment filtering, ensuring students only see assignments relevant to their selected class. Key features include automatic score recalculation upon answer key changes, a comprehensive teacher dashboard for managing classes, folders, assignments, and student results, and a student view that dynamically adapts to class and folder completion statuses. The application aims to streamline homework submission and feedback, providing a robust platform for educational institutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **UI Component System**: Shadcn/ui (configured in "new-york" style) built on Radix UI primitives, styled with Tailwind CSS.
- **Routing**: Wouter for client-side navigation.
- **State Management**: TanStack Query for server state caching (without optimistic updates or auto-refetching).
- **Form Handling**: React Hook Form with Zod for type-safe validation.
- **Design System**: Noto Sans KR font, Tailwind-based spacing, responsive layouts (max-w-md, max-w-2xl, max-w-6xl), and color-coded feedback.

### Backend Architecture
- **Framework**: Express.js with TypeScript (ES modules).
- **Server Structure**: Single entry point with middleware and route registration, including API logging and JSON body parsing.
- **API Endpoints**:
    - **Folders**: CRUD and reordering.
    - **Assignments**: CRUD, reordering, class-specific listing, answer key management, and submission retrieval.
    - **Submissions**: Creation and retrieval.
    - **Settings**: Get and update app title.
    - **Authentication**: Teacher login.
- **Storage Strategy**: PostgreSQL database via Drizzle ORM.
- **Validation**: Zod schemas shared between client and server for data consistency.
- **Scoring Logic**: Server-side normalized comparison for answers supporting multi-select questions. Answers are normalized (trim, lowercase, split by comma, sort, join) before comparison, ensuring "1, 2" matches "2, 1" and "1,2". Scores stored per submission with automatic regrading when answer keys change.

### System Design Choices
- **Data Persistence**: Migrated from in-memory to PostgreSQL (Neon) for production-ready persistence using Drizzle ORM.
- **Assignment-Class Relationship**: Many-to-many via a `assignmentClasses` junction table, allowing assignments to be linked to multiple classes.
- **Folder System**: Assignments can be organized into folders, with "Uncategorized" for those without. Folder completion status (`completed` boolean) affects visibility for students and grouping in the teacher dashboard.
- **Completion Logic**: Classes, folders, and assignments can be marked as "completed" (`종강`). Students only see active items. Assignment completion can be inherited from parent folders.
- **Automatic Regrading**: Submissions store `questionNumbers` to safely regrade when answer keys change, preventing incorrect regrades if the question structure is altered.
- **Teacher Dashboard**: Six-tab interface for managing classes, folders, assignments, answer keys, student results, and app settings. Features collapsible sections for completed items in most tabs, with Select dropdown for completed assignments in Answer Keys tab (consistent with Results tab pattern).
- **Student View**: Requires class selection, displays only active assignments grouped by folder, and hides completed classes/assignments.
- **Terminology**: Updated "주차" (week) to "문제" (problem/assignment).
- **Transactional Operations**: Reordering operations and answer key updates are wrapped in database transactions for data integrity.

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless database for persistent storage.

### UI Components
- **Radix UI primitives**: Foundation for accessible UI components.
- **Lucide React**: Icon library.

### Fonts
- **Google Fonts**: Noto Sans KR for Korean text.

### Build Tools
- **Vite**: Development server and production bundler.
- **ESBuild**: Server-side bundling.
- **TypeScript**: For type checking.
- **PostCSS with Tailwind CSS and Autoprefixer**: For styling.

### Utilities
- **date-fns**: Date manipulation.
- **clsx + tailwind-merge**: Utility for conditionally combining CSS classes.
- **class-variance-authority**: For managing component variants.