# Technology Stack & Build System

## Core Technologies
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Create React App (CRA)
- **State Management**: Zustand for global state
- **UI Framework**: Material-UI (MUI) v5
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios with custom API service layer
- **Styling**: MUI's `sx` prop and styled components

## Key Dependencies
- **AWS SDK**: S3 client, Bedrock Runtime for AI features
- **Charts**: Chart.js, React-Chartjs-2, Recharts
- **Forms**: React Hook Form
- **File Handling**: React Dropzone, XLSX for Excel processing
- **PDF Generation**: jsPDF, html2canvas
- **Date Handling**: date-fns
- **Fonts**: Inter, Pretendard, Noto Sans KR

## Version Constraints
**CRITICAL**: Maintain these exact version ranges to avoid compatibility issues:
- `"react": "^18.0.0"` (NOT React 19)
- `"@mui/material": "^5.15.0"` (NOT v6)
- Previous React 19 + MUI v5 conflicts caused major refactoring

## Build Commands
```bash
# Development
npm start                 # Start dev server on localhost:3000
npm test                  # Run test suite
npm run build            # Production build
npm run eject            # Eject from CRA (avoid unless necessary)

# Package Management
npm install              # Install dependencies
npm outdated            # Check for outdated packages (review before updating)
```

## Environment Setup
- Node.js 16.0.0+ required
- Environment variables in `.env` file
- AWS credentials for S3/Bedrock integration
- Backend API endpoint configuration in `src/config/api.ts`

## TypeScript Configuration
- Strict mode enabled
- ES5 target with ESNext modules
- JSX: react-jsx (React 17+ transform)
- Absolute imports from `src/` directory