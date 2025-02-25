# Halotaro Development Guide

## Build and Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test -- -t "test name"` - Run a specific test
- `npm run start:scheduler` - Start scheduler service
- `npm run start:create-payment-intents-scheduler` - Start payment intents scheduler

## Code Style Guidelines
- **Imports**: Use absolute imports with `@/` prefix
- **TypeScript**: Strict typing required, avoid `any` when possible
- **Naming**: 
  - Components: PascalCase (e.g., `ReservationForm.tsx`)
  - Utilities/hooks: camelCase (e.g., `useReservationCalendar.ts`)
  - Files: kebab-case (e.g., `reservation-view.tsx`)
- **Components**: Use functional components with TypeScript interfaces
- **Error Handling**: Use try/catch with appropriate error logging
- **API Routes**: Follow RESTful conventions in `/api` routes
- **State Management**: Use contexts for global state when needed

## Project Structure
- `/src/app` - Next.js routes and API endpoints
- `/src/components` - Reusable UI components
- `/src/sections` - Page-specific components
- `/src/utils` - Utility functions
- `/src/types` - TypeScript type definitions