import React, { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  useTheme,
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { dashboardAPI, SurveyStats as SurveyStatsType } from '../../services/apiService';

interface SurveyStatsProps {
  workspaceId?: string;
}

const getStatusChipColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return {
        bgColor: 'rgba(34, 197, 94, 0.1)',
        textColor: '#16a34a',
        label: '진행중'
      };
    case 'draft':
      return {
        bgColor: 'rgba(100, 116, 139, 0.1)',
        textColor: '#475569',
        label: '준비중'
      };
    case 'inactive':
    case 'closed':
       return {
        bgColor: 'rgba(239, 68, 68, 0.1)',
        textColor: '#ef4444',
        label: '마감'
      };
    default:
      return {
        bgColor: '#f1f5f9',
        textColor: '#64748b',
        label: status
      };
  }
};

const getProgressColor = (rate: number): 'success' | 'warning' | 'primary' | 'error' => {
  if (rate >= 80) return 'success';
  if (rate >= 50) return 'primary';
  if (rate >= 25) return 'warning';
  return 'error';
};

export function SurveyStats({ workspaceId }: SurveyStatsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SurveyStatsType[]>([]);
  useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getSurveyStats({ 
          workspace_id: workspaceId, 
          include_all: true 
        });
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
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats || stats.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{error || '표시할 설문 데이터가 없습니다.'}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          설문별 참여 현황
        </Typography>
        <Tooltip title="각 설문의 목표 인원 대비 참여 현황을 보여줍니다.">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ borderBottom: 'none', pb: 2 }}>설문 정보</TableCell>
              <TableCell sx={{ borderBottom: 'none', pb: 2 }}>상태</TableCell>
              <TableCell sx={{ borderBottom: 'none', pb: 2 }} align="right">참여 현황</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.map((survey) => {
              const chipColors = getStatusChipColor(survey.status);
              return (
                <TableRow key={survey.survey_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row" sx={{ borderBottom: 'none' }}>
                    <Typography fontWeight="500">{survey.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {survey.workspace_title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Chip
                      label={chipColors.label}
                      size="small"
                      sx={{
                        backgroundColor: chipColors.bgColor,
                        color: chipColors.textColor,
                        fontWeight: '600',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: 'none' }}>
                    <Box sx={{ minWidth: 150 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {survey.completed_count} / {survey.target} 명
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {survey.achievement_rate.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={survey.achievement_rate}
                        color={getProgressColor(survey.achievement_rate)}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
} 