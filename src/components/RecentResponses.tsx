import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import { People, AccessTime, School } from '@mui/icons-material';
import S3Service, { SurveyResponse } from '../services/s3Service';
import { workspaceAPI } from '../services/apiService';

interface RecentResponsesProps {
  workspaceId?: string; // 사용하지 않지만 호환성을 위해 유지
}

const RecentResponses: React.FC<RecentResponsesProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentResponses, setRecentResponses] = useState<SurveyResponse[]>([]);
  const [activeWorkspaces, setActiveWorkspaces] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📋 최근 응답 데이터 로드 시작');
        
        // 활성 워크스페이스 목록 가져오기
        const workspaces = await workspaceAPI.getAll();
        const activeWorkspaceNames = workspaces.map(w => w.title);
        setActiveWorkspaces(activeWorkspaceNames);
        console.log('📋 활성 워크스페이스:', activeWorkspaceNames);
        
        // S3에서 모든 응답 데이터 가져오기
        const allResponses = await S3Service.listAllReports();
        console.log('📋 로드된 전체 응답 수:', allResponses.length);
        
        // 활성 워크스페이스의 응답만 필터링
        const filteredResponses = allResponses.filter(response => 
          activeWorkspaceNames.includes(response.workspaceName)
        );
        console.log('📋 활성 워크스페이스 응답 수:', filteredResponses.length);
        
        // 제출 시간순으로 정렬하고 최근 5개만 가져오기
        const sortedResponses = filteredResponses
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          .slice(0, 5);
        
        console.log('📋 최근 5개 응답:', sortedResponses);
        setRecentResponses(sortedResponses);
        setError(null);
      } catch (err: any) {
        console.error('최근 응답 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return '#10b981'; // 우수 - 초록
    if (score >= 3.0) return '#6366f1'; // 양호 - 파랑
    if (score >= 2.0) return '#f59e0b'; // 보통 - 주황
    return '#ef4444'; // 개선필요 - 빨강
  };

  const getScoreLevel = (score: number) => {
    if (score >= 4.0) return '우수';
    if (score >= 3.0) return '양호';
    if (score >= 2.0) return '보통';
    return '개선필요';
  };

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography color="error" sx={{ fontSize: '14px', fontWeight: 500 }}>{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        transition: 'all 0.2s ease-in-out',
        height: 400, // 고정 높이 설정
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.1)',
        }
      }}
    >
      {/* 헤더 */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
      borderRadius: 2,
              background: 'linear-gradient(135deg, #8b5cf620 0%, #8b5cf610 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <People sx={{ color: '#8b5cf6', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                fontSize: '18px'
              }}
            >
            최근 응답자
          </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
                fontSize: '12px'
              }}
            >
              최근 5개 응답
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* 응답자 목록 */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {recentResponses.length > 0 ? (
          <List sx={{ py: 0, px: 2 }}>
            {recentResponses.map((response, index) => {
              // 점수 계산 (기존 overallScore가 있으면 사용, 없으면 answers에서 계산)
              let overallScore = 0;
              if (response.aiAnalysis?.overallScore) {
                overallScore = response.aiAnalysis.overallScore;
              } else if (response.answers) {
                const scores = Object.values(response.answers) as number[];
                overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
              }

              return (
                <React.Fragment key={`${response.workspaceName}-${response.studentInfo.name}-${response.submittedAt}`}>
                  <ListItem
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 2,
                      '&:hover': {
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: getScoreColor(overallScore),
                          width: 36,
                          height: 36,
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {response.studentInfo.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 500,
                              color: '#1e293b',
                              fontSize: '14px'
                            }}
                          >
                            {response.studentInfo.name}
                          </Typography>
                          <Chip
                            label={overallScore.toFixed(1)}
                            size="small"
                            sx={{
                              backgroundColor: `${getScoreColor(overallScore)}20`,
                              color: getScoreColor(overallScore),
                              fontWeight: 600,
                              fontSize: '11px',
                              height: '20px',
                              minWidth: '40px',
                              '& .MuiChip-label': {
                                px: 1
                              }
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '12px',
                              display: 'block'
                            }}
                          >
                            {response.workspaceName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <AccessTime sx={{ fontSize: 10, color: '#94a3b8' }} />
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#94a3b8',
                                fontSize: '10px'
                              }}
                            >
                      {new Date(response.submittedAt).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentResponses.length - 1 && (
                    <Divider sx={{ mx: 2, opacity: 0.5 }} />
                  )}
                </React.Fragment>
              );
            })}
          </List>
              ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              py: 4
            }}
          >
            <People sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography
              sx={{
                color: '#64748b',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
                    최근 응답이 없습니다
            </Typography>
          </Box>
              )}
      </Box>
    </Paper>
  );
};

export default RecentResponses;
