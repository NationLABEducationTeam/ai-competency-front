import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import WorkspaceDetail from './pages/WorkspaceDetail';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import SurveyForm from './pages/SurveyForm';
import Settings from './pages/Settings';
import ThankYou from './pages/ThankYou';
import Trash from './pages/Trash';
import DashboardLayout from './components/Layout/DashboardLayout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4763E4',
      light: '#6366f1',
      dark: '#1E40AF',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      300: '#D1D5DB',
      500: '#6B7280',
      700: '#374151',
      900: '#111827',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '0.5rem 1rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#D1D5DB',
            },
            '&:hover fieldset': {
              borderColor: '#9CA3AF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4763E4',
            },
          },
        },
      },
    },
  },
});

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // 앱 시작 시 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        checkAuth();
      } finally {
        setIsInitializing(false);
      }
    };
    
    initAuth();
  }, [checkAuth]);

  // 초기화 중일 때는 로딩 화면 표시
  if (isInitializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: '#F9FAFB'
        }}>
          <div style={{ 
            color: '#4763E4', 
            fontSize: '18px', 
            fontWeight: 600,
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>🤖</div>
            AI 역량 평가 시스템 로딩 중...
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/survey/:surveyId" element={<SurveyForm />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <DashboardLayout />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="workspaces/:workspaceId" element={<WorkspaceDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:workspaceId" element={<Reports />} />
            <Route path="reports/detail/:reportId" element={<ReportDetail />} />
            <Route path="trash" element={<Trash />} />
            <Route path="settings" element={<Settings />} />
            <Route path="reports/:surveyId" element={<Reports />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
