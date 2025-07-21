import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './store/authStore';
import { theme } from './theme'; // 테마 분리 가정ㄴㄴㄴㄴㄴ
import AlertDialog from './components/common/AlertDialog';
import DashboardLayout from './components/Layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import WorkspaceDetail from './pages/WorkspaceDetail';
import SurveyForm from './pages/SurveyForm';
import ThankYou from './pages/ThankYou';
// import ReportDetail from './pages/ReportDetail';
import Settings from './pages/Settings';
import Trash from './pages/Trash';
import Reports from './pages/Reports';
import ExportResults from './pages/ExportResults';

const PrivateRoute: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />;
};

function App() {
  const { initialized, checkAuth } = useAuthStore();

  useEffect(() => {
        checkAuth();
  }, [checkAuth]);

  if (!initialized) {
    return <div>Loading...</div>; // Or a splash screen
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AlertDialog />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/survey/:surveyId" element={<SurveyForm />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/*" element={<PrivateRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="workspaces/:workspaceId" element={<WorkspaceDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:workspaceId" element={<Reports />} />
            <Route path="reports/:workspaceId/:surveyId" element={<Reports />} />
            {/* <Route path="reports/detail/:reportId" element={<ReportDetail />} /> */}
            <Route path="export" element={<ExportResults />} />
            <Route path="trash" element={<Trash />} />
            <Route path="settings" element={<Settings />} />
            <Route index element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
