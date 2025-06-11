import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
} from '@mui/material';
import { surveySubmissionAPI } from '../services/apiService';

interface SubmissionLog {
  id: string;
  workspace_id: string;
  survey_id: string;
  survey_title?: string;
  workspace_title?: string;
  respondent_name: string;
  respondent_email: string;
  submission_date: string;
  completion_status: 'started' | 'completed' | 'abandoned';
  completion_time?: number;
}

interface SurveySubmissionLogsProps {
  surveyId?: string;
  workspaceId?: string;
  studentEmail?: string;
}

const SurveySubmissionLogs: React.FC<SurveySubmissionLogsProps> = ({
  surveyId,
  workspaceId,
  studentEmail,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total_count: 0,
    completed_count: 0,
    started_count: 0,
    abandoned_count: 0,
  });

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        if (surveyId) {
          response = await surveySubmissionAPI.getSurveySubmissions(surveyId);
          setSubmissions(response.submissions);
          setStats({
            total_count: response.total_count,
            completed_count: response.completed_count,
            started_count: response.started_count,
            abandoned_count: response.abandoned_count,
          });
        } else if (workspaceId) {
          response = await surveySubmissionAPI.getWorkspaceSubmissions(workspaceId);
          setSubmissions(response.submissions);
          setStats({
            total_count: response.total_count,
            completed_count: response.completed_count,
            started_count: response.started_count,
            abandoned_count: response.abandoned_count,
          });
        } else if (studentEmail) {
          response = await surveySubmissionAPI.getStudentSubmissions(studentEmail, workspaceId);
          setSubmissions(response.submissions);
          setStats({
            total_count: response.total_count,
            completed_count: response.completed_count,
            started_count: response.started_count,
            abandoned_count: response.abandoned_count,
          });
        }
      } catch (err) {
        setError('제출 로그를 불러오는데 실패했습니다.');
        console.error('제출 로그 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [surveyId, workspaceId, studentEmail]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'started':
        return 'warning';
      case 'abandoned':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3} display="flex" gap={2}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>전체</Typography>
          <Typography variant="h4">{stats.total_count}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>완료</Typography>
          <Typography variant="h4" color="success.main">{stats.completed_count}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>진행중</Typography>
          <Typography variant="h4" color="warning.main">{stats.started_count}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>중단</Typography>
          <Typography variant="h4" color="error.main">{stats.abandoned_count}</Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>응답자</TableCell>
              <TableCell>이메일</TableCell>
              {!surveyId && <TableCell>설문</TableCell>}
              {!workspaceId && <TableCell>워크스페이스</TableCell>}
              <TableCell>제출 시간</TableCell>
              <TableCell>소요 시간</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.respondent_name}</TableCell>
                  <TableCell>{submission.respondent_email}</TableCell>
                  {!surveyId && <TableCell>{submission.survey_title}</TableCell>}
                  {!workspaceId && <TableCell>{submission.workspace_title}</TableCell>}
                  <TableCell>{formatDate(submission.submission_date)}</TableCell>
                  <TableCell>{formatTime(submission.completion_time)}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        submission.completion_status === 'completed' ? '완료' :
                        submission.completion_status === 'started' ? '진행중' : '중단'
                      }
                      color={getStatusColor(submission.completion_status) as any}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={submissions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행 수"
        />
      </TableContainer>
    </Box>
  );
};

export default SurveySubmissionLogs; 