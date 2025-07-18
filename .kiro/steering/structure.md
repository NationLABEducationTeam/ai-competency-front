# Project Structure & Architecture

## Folder Organization
```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components (DashboardLayout)
│   ├── common/         # Shared components (AlertDialog)
│   └── dashboard/      # Dashboard-specific components
├── pages/              # Route-level page components
├── store/              # Zustand state management
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── utils/              # Utility functions
└── hooks/              # Custom React hooks (currently empty)
```

## Architecture Patterns

### State Management
- **Zustand stores** for global state (auth, workspace, UI)
- **useState** for local component state
- Store files follow pattern: `[domain]Store.ts`

### API Layer
- Centralized API service in `services/apiService.ts`
- Grouped by domain: `authAPI`, `workspaceAPI`, `surveyAPI`, etc.
- Consistent error handling with 401 redirect logic
- Request/response logging for debugging

### Component Structure
- **Functional components** with React Hooks only
- **TypeScript interfaces** for all props and data structures
- **MUI sx prop** for styling (preferred over styled components)
- **Responsive design** using MUI breakpoints

### Routing
- **React Router DOM v7** with nested routes
- **PrivateRoute** wrapper for authenticated pages
- **DashboardLayout** as container for admin pages
- Public routes: `/login`, `/survey/:id`, `/thank-you`

## Naming Conventions
- **Components**: PascalCase (e.g., `DashboardLayout.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **API methods**: camelCase (e.g., `getAll`, `createWorkspace`)
- **Store actions**: camelCase (e.g., `login`, `logout`, `checkAuth`)

## Type Safety
- All API responses have corresponding TypeScript interfaces
- **Critical**: Keep `src/types/index.ts` synchronized with backend schemas
- Common issue: `workspace.name` vs `workspace.title` mismatches

## Styling Guidelines
- **Primary approach**: MUI `sx` prop for component styling
- **Theme usage**: Colors, typography, and spacing from `src/theme.ts`
- **Responsive**: Use MUI breakpoints (`xs`, `sm`, `md`, `lg`, `xl`)
- **Custom theme**: Blue primary (#4763E4), clean gray palette

## File Import Patterns
- **Relative imports** for local files
- **Absolute imports** from `src/` (configured in tsconfig.json)
- **Barrel exports** in `types/index.ts` for clean imports