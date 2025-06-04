import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore';
import { dashboardAPI, workspaceAPI } from '../services/apiService';
import S3Service from '../services/s3Service';
import RecentResponses from '../components/RecentResponses';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Container,
} from '@mui/material';
import {
  People,
  Assessment,
  TrendingUp,
  ExpandMore,
  Timeline,
  CheckCircle,
  BarChart,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  School,
  CalendarToday,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import SubmissionOverview from '../components/dashboard/SubmissionOverview';
import SubmissionTrend from '../components/dashboard/SubmissionTrend';
import DailySubmissions from '../components/dashboard/DailySubmissions';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// 기본 데이터 (모든 값 0)
const mockDailyActivity = [
  { date: '1/1', participants: 0, responses: 0 },
  { date: '1/2', participants: 0, responses: 0 },
  { date: '1/3', participants: 0, responses: 0 },
  { date: '1/4', participants: 0, responses: 0 },
  { date: '1/5', participants: 0, responses: 0 },
  { date: '1/6', participants: 0, responses: 0 },
  { date: '1/7', participants: 0, responses: 0 },
];

const mockCompetencyData = [
  { category: 'AI 기본 이해', score: 0 },
  { category: '문제 해결', score: 0 },
  { category: '데이터 해석', score: 0 },
  { category: '협업 소통', score: 0 },
  { category: '트렌드 민감도', score: 0 },
  { category: 'AI 윤리', score: 0 },
];

const mockHeatmapData = [
  { workspace: '성균관대학교', ai_basic: 0, problem_solving: 0, data_interpretation: 0, collaboration: 0, trend_awareness: 0, ai_ethics: 0 },
  { workspace: '숙명여자대학교', ai_basic: 0, problem_solving: 0, data_interpretation: 0, collaboration: 0, trend_awareness: 0, ai_ethics: 0 },
  { workspace: '경남대학교', ai_basic: 0, problem_solving: 0, data_interpretation: 0, collaboration: 0, trend_awareness: 0, ai_ethics: 0 },
];

const mockRecentActivity: any[] = [];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, setWorkspaces, currentWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 대시보드 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 워크스페이스 목록 로드
        const workspacesData = await workspaceAPI.getAll();
        setWorkspaces(workspacesData);

      } catch (err: any) {
        console.error('대시보드 데이터 로드 실패:', err);
        setError(err.response?.data?.detail || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [setWorkspaces]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{
            backgroundColor: '#1976d2',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          {/* 설문 제출 현황 개요 */}
                <Box>
            <SubmissionOverview />
      </Box>

      {/* 차트 섹션 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            {/* 시간대별 설문 제출 추이 */}
            <Box>
              <SubmissionTrend />
            </Box>

            {/* 최근 응답자 */}
            <Box>
              <RecentResponses />
            </Box>
      </Box>

          {/* 일별 제출 현황 */}
              <Box>
            <DailySubmissions />
              </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard; 