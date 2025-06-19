import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { dashboardAPI } from '../services/apiService';
import RecentResponses from '../components/dashboard/RecentResponses';
import { Box, Typography, Paper, Container, useTheme, alpha } from '@mui/material';
import { Assessment, CheckCircle, TrendingUp, Group } from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import DailySubmissions from '../components/dashboard/DailySubmissions';
import { SurveyStats } from '../components/dashboard/SurveyStats';

interface DashboardSummary {
  total_submissions: number;
  completion_rate: number;
  average_score: number;
}

const estimatedActiveUsers = (total_submissions: number, completion_rate: number) => {
  return Math.round(total_submissions * completion_rate);
};


const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { currentWorkspace } = useWorkspaceStore();
  
  const [summary, setSummary] = useState<DashboardSummary>({
    total_submissions: 0,
    completion_rate: 0,
    average_score: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getSummary();
        setSummary(response);
        setError(null);
      } catch (err) {
        console.error('대시보드 요약 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [currentWorkspace]);

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="xl">
        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {/* Stats Grid */}
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
          gap={3}
          mb={4}
        >
          <StatCard
            title="총 제출"
            value={summary.total_submissions}
            icon={Assessment}
            trend={5.7}
            color="primary"
          />
          <StatCard
            title="완료율"
            value={`${summary.completion_rate.toFixed(1)}%`}
            icon={CheckCircle}
            trend={2.4}
            color="success"
          />
          <StatCard
            title="평균 점수"
            value={summary.average_score.toFixed(1)}
            icon={TrendingUp}
            trend={-1.5}
            color="warning"
          />
          <StatCard
            title="활성 사용자"
            value={loading ? '-' : estimatedActiveUsers(summary.total_submissions, summary.completion_rate)}
            icon={Group}
            trend={12.3}
            color="info"
          />
        </Box>

        {/* Charts Grid */}
        <Box display="grid" gap={3}>
          <Paper 
            sx={{ 
              p: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(6px)'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>설문별 참여율</Typography>
            <SurveyStats />
          </Paper>

          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }}
            gap={3}
          >
            <Paper 
              sx={{ 
                p: 3,
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(6px)'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>일별 제출 현황</Typography>
              <DailySubmissions workspaceId={currentWorkspace?.id} />
            </Paper>
            <Paper 
              sx={{ 
                p: 3,
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(6px)'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>최근 응답</Typography>
              <RecentResponses workspaceId={currentWorkspace?.id} />
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard; 