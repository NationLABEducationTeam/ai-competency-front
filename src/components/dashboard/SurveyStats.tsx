import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { dashboardAPI, type SurveyStats as SurveyStatsType } from '../../services/apiService';

interface SurveyStatsProps {
  workspaceId?: string;
}

export function SurveyStats({ workspaceId }: SurveyStatsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SurveyStatsType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getSurveyStats({ workspace_id: workspaceId });
        setStats(response);
        setError(null);
      } catch (err) {
        console.error('설문 통계 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error || !stats.length) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          borderRadius: 3,
          border: '1px solid #f1f5f9',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {error || '아직 생성된 설문이 없습니다.'}
        </Typography>
      </Paper>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'closed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '진행중';
      case 'draft':
        return '임시저장';
      case 'closed':
        return '종료';
      default:
        return status;
    }
  };

  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #f1f5f9' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>설문 제목</TableCell>
            <TableCell>워크스페이스</TableCell>
            <TableCell align="right">목표 응답수</TableCell>
            <TableCell align="right">현재 응답수</TableCell>
            <TableCell align="right">달성률</TableCell>
            <TableCell align="center">상태</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((survey) => (
            <TableRow key={survey.survey_id}>
              <TableCell>{survey.title}</TableCell>
              <TableCell>{survey.workspace_title}</TableCell>
              <TableCell align="right">{survey.target}</TableCell>
              <TableCell align="right">{survey.completed_count}</TableCell>
              <TableCell align="right">{survey.achievement_rate}%</TableCell>
              <TableCell align="center">
                <Chip
                  label={getStatusText(survey.status)}
                  color={getStatusColor(survey.status) as any}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 