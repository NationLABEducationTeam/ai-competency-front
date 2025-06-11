import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Person, AccessTime, InfoOutlined } from '@mui/icons-material';
import { dashboardAPI, RecentSubmission } from '../../services/apiService';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface RecentResponsesProps {
  workspaceId?: string;
}

const RecentResponses: React.FC<RecentResponsesProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getRecentSubmissions(5, { workspace_id: workspaceId });
        setSubmissions(response);
        setError(null);
      } catch (err) {
        console.error('최근 응답 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'M.d a h:mm', { locale: ko });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#4E7AEF'; // 토스 메인 블루
      case 'in_progress':
        return '#F59E0B'; // 토스 옐로우
      case 'abandoned':
        return '#F45B69'; // 토스 레드
      default:
        return '#8B95A1'; // 토스 그레이
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '완료';
      case 'in_progress':
        return '진행중';
      case 'abandoned':
        return '중단';
      default:
        return '대기';
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight={300}
        sx={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(247,249,255,0.6) 100%)',
          borderRadius: 3,
          border: '1px solid #F2F4F6'
        }}
      >
        <CircularProgress size={32} sx={{ color: '#4E7AEF' }} />
      </Box>
    );
  }

  if (error || !submissions.length) {
    return (
      <Box 
        sx={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(247,249,255,0.6) 100%)',
          borderRadius: 3,
          border: '1px solid #F2F4F6',
          p: 4,
          textAlign: 'center',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Person sx={{ fontSize: 48, color: '#E4E9F2', mb: 2 }} />
        <Typography 
          sx={{ 
            color: '#4E5968',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.02em'
          }}
        >
          {error || '아직 응답이 없습니다'}
        </Typography>
        <Typography 
          sx={{ 
            color: '#8B95A1',
            fontSize: '14px',
            mt: 1,
            letterSpacing: '-0.02em'
          }}
        >
          새로운 응답이 등록되면 여기에 표시됩니다
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(247,249,255,0.6) 100%)',
        borderRadius: 3,
        border: '1px solid #F2F4F6',
        overflow: 'hidden'
      }}
    >
      <Box 
        sx={{ 
          p: 3, 
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography 
          component="h2"
          sx={{ 
            fontSize: '15px',
            fontWeight: 700,
            color: '#191F28',
            letterSpacing: '-0.02em'
          }}
        >
          최근 응답
        </Typography>
        <Tooltip title="가장 최근에 제출된 5개의 응답을 보여줍니다">
          <IconButton size="small">
            <InfoOutlined sx={{ fontSize: 16, color: '#8B95A1' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <List sx={{ px: 2 }}>
        {submissions.map((submission, index) => (
          <React.Fragment key={submission.submitted_at}>
            <ListItem
              sx={{
                px: 2,
                py: 2,
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(78, 122, 239, 0.04)',
                }
              }}
            >
              <ListItemAvatar>
                <Avatar 
                  sx={{ 
                    bgcolor: `${getStatusColor(submission.status)}15`,
                    color: getStatusColor(submission.status),
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  {submission.respondent_name.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#191F28',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {submission.respondent_name}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '13px',
                        color: getStatusColor(submission.status),
                        fontWeight: 600,
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {getStatusText(submission.status)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box component="div">
                    <Typography
                      component="div"
                      sx={{
                        fontSize: '13px',
                        color: '#4E5968',
                        mb: 0.5,
                        letterSpacing: '-0.02em',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {submission.survey_title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '12px',
                          color: '#8B95A1',
                          letterSpacing: '-0.02em'
                        }}
                      >
                        {submission.workspace_title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 12, color: '#8B95A1' }} />
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '12px',
                            color: '#8B95A1',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {formatDate(submission.submitted_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            {index < submissions.length - 1 && (
              <Divider 
                sx={{ 
                  mx: 2,
                  borderColor: '#F2F4F6'
                }} 
              />
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default RecentResponses; 