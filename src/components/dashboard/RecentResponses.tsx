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
} from '@mui/material';
import { Person } from '@mui/icons-material';
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
        const response = await dashboardAPI.getRecentSubmissions(10, { workspace_id: workspaceId });
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
      return format(parseISO(dateString), 'PPP p', { locale: ko });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !submissions.length) {
    return (
      <Box textAlign="center" py={3}>
        <Typography color="text.secondary">
          {error || '최근 응답이 없습니다.'}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {submissions.map((submission, index) => (
        <React.Fragment key={index}>
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Avatar>
                <Person />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={submission.respondent_name}
              secondary={
                <React.Fragment>
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.primary"
                    sx={{ display: 'block' }}
                  >
                    {submission.survey_title}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                  >
                    {format(parseISO(submission.submitted_at), 'PPP a h:mm', { locale: ko })}
                  </Typography>
                </React.Fragment>
              }
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                ml: 2,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {submission.workspace_title}
              </Typography>
            </Box>
          </ListItem>
          {index < submissions.length - 1 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default RecentResponses; 