import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import {
  FileDownloadOutlined,
  RefreshOutlined,
  CheckCircleOutlined,
  ErrorOutlined,
} from '@mui/icons-material';
import { workspaceAPI, surveyAPI, surveySubmissionAPI } from '../services/apiService';
import { Workspace, Survey } from '../types';

interface WorkspaceWithStats extends Workspace {
  surveyCount: number;
  responseCount: number;
}

interface SurveyWithStats extends Survey {
  responseCount: number;
}

interface ExportJob {
  id: string;
  workspaceId: string;
  workspaceName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  errorMessage?: string;
}

const ExportResults: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithStats[]>([]);
  const [surveys, setSurveys] = useState<SurveyWithStats[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadWorkspaces();
    loadExportJobs();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadSurveys(selectedWorkspace);
    } else {
      setSurveys([]);
      setSelectedSurvey('');
    }
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      console.log('🔍 워크스페이스 목록 로딩 시작');
      const workspaceList = await workspaceAPI.getAll();
      
      // 각 워크스페이스의 설문 수와 응답 수를 계산
      const workspacesWithStats = await Promise.all(
        workspaceList.map(async (workspace) => {
          try {
            const workspaceSurveys = await surveyAPI.getByWorkspace(workspace.id);
            let totalResponses = 0;
            
            // 각 설문의 응답 수를 합산
            for (const survey of workspaceSurveys) {
              try {
                const submissions = await surveySubmissionAPI.getSurveySubmissions(survey.id);
                totalResponses += submissions.completed_count || 0;
              } catch (error) {
                console.warn(`설문 ${survey.id} 응답 수 조회 실패:`, error);
              }
            }
            
            return {
              ...workspace,
              surveyCount: workspaceSurveys.length,
              responseCount: totalResponses,
            } as WorkspaceWithStats;
          } catch (error) {
            console.warn(`워크스페이스 ${workspace.id} 통계 조회 실패:`, error);
            return {
              ...workspace,
              surveyCount: 0,
              responseCount: 0,
            } as WorkspaceWithStats;
          }
        })
      );
      
      setWorkspaces(workspacesWithStats);
      console.log('✅ 워크스페이스 목록 로딩 완료:', workspacesWithStats);
    } catch (error) {
      console.error('❌ 워크스페이스 로딩 실패:', error);
      // 에러 발생 시 빈 배열로 설정
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSurveys = async (workspaceId: string) => {
    setLoadingSurveys(true);
    try {
      console.log('🔍 설문 목록 로딩 시작:', workspaceId);
      const surveyList = await surveyAPI.getByWorkspace(workspaceId);
      
      // 각 설문의 응답 수를 조회
      const surveysWithStats = await Promise.all(
        surveyList.map(async (survey) => {
          try {
            const submissions = await surveySubmissionAPI.getSurveySubmissions(survey.id);
            return {
              ...survey,
              responseCount: submissions.completed_count || 0,
            } as SurveyWithStats;
          } catch (error) {
            console.warn(`설문 ${survey.id} 응답 수 조회 실패:`, error);
            return {
              ...survey,
              responseCount: 0,
            } as SurveyWithStats;
          }
        })
      );
      
      setSurveys(surveysWithStats);
      console.log('✅ 설문 목록 로딩 완료:', surveysWithStats);
    } catch (error) {
      console.error('❌ 설문 로딩 실패:', error);
      setSurveys([]);
    } finally {
      setLoadingSurveys(false);
    }
  };

  const loadExportJobs = async () => {
    try {
      // TODO: API 호출로 export 작업 목록 가져오기
      // const response = await exportAPI.getJobs();
      // setExportJobs(response.data);
      
      // 더미 데이터 제거 - 빈 배열로 초기화
      setExportJobs([]);
    } catch (error) {
      console.error('Export 작업 로딩 실패:', error);
      setExportJobs([]);
    }
  };

  const handleExport = async () => {
    if (!selectedWorkspace || !selectedSurvey) return;

    const selectedWorkspaceData = workspaces.find(w => w.id === selectedWorkspace);
    const selectedSurveyData = surveys.find(s => s.id === selectedSurvey);
    
    if (!selectedWorkspaceData || !selectedSurveyData) {
      console.error('선택된 워크스페이스 또는 설문 데이터를 찾을 수 없습니다.');
      return;
    }

    setExporting(true);
    try {
      // 🔥 람다 함수 URL 설정
      const LAMBDA_URL = 'https://o3nujxwq3he4ucecavi4nbvmi40vwpfy.lambda-url.ap-northeast-2.on.aws/';
      
      console.log('🚀 람다 함수 호출 시작:', {
        workspace_name: selectedWorkspaceData.title,
        survey_name: selectedSurveyData.title
      });
      
      // 람다 함수 호출
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_name: selectedWorkspaceData.title,
          survey_name: selectedSurveyData.title
        })
      });
      
      console.log('📥 람다 함수 응답 상태:', response.status, response.statusText);
      
      // 응답 텍스트 먼저 확인
      const responseText = await response.text();
      console.log('📥 람다 함수 응답 텍스트:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON 파싱 실패:', parseError);
        throw new Error(`서버 응답을 파싱할 수 없습니다: ${responseText.substring(0, 100)}...`);
      }
      
      console.log('📥 람다 함수 응답 파싱 완료:', result);
      
      if (response.ok && result.success) {
        const newJob: ExportJob = {
          id: Date.now().toString(),
          workspaceId: selectedWorkspace,
          workspaceName: `${selectedWorkspaceData.title} - ${selectedSurveyData.title}`,
          status: 'completed',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          downloadUrl: result.download_url,
        };
        setExportJobs(prev => [newJob, ...prev]);
        setSelectedWorkspace('');
        setSelectedSurvey('');
        
        console.log('✅ Export 작업 완료:', newJob);
      } else {
        throw new Error(result.message || 'Export 실패');
      }
      
    } catch (error) {
      console.error('Export 시작 실패:', error);
      // 에러 처리 - 실패한 작업으로 표시
      const failedJob: ExportJob = {
        id: Date.now().toString(),
        workspaceId: selectedWorkspace,
        workspaceName: `${selectedWorkspaceData.title} - ${selectedSurveyData.title}`,
        status: 'failed',
        createdAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Export 처리 중 오류가 발생했습니다.',
      };
      setExportJobs(prev => [failedJob, ...prev]);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      // TODO: 실제 다운로드 구현
      window.open(job.downloadUrl, '_blank');
    }
  };

  const getStatusChip = (status: ExportJob['status']) => {
    const statusConfig = {
      pending: { label: '대기중', color: 'default' as const, icon: <CircularProgress size={16} /> },
      processing: { label: '처리중', color: 'warning' as const, icon: <CircularProgress size={16} /> },
      completed: { label: '완료', color: 'success' as const, icon: <CheckCircleOutlined /> },
      failed: { label: '실패', color: 'error' as const, icon: <ErrorOutlined /> },
    };

    const config = statusConfig[status];
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        sx={{ minWidth: 80 }}
      />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
          결과 Export
        </Typography>
        <Typography variant="body1" sx={{ color: '#6B7280' }}>
          학생들의 AI 역량평가 결과를 엑셀 파일로 다운로드할 수 있습니다.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Export 생성 섹션 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                새 Export 생성
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>워크스페이스 선택</InputLabel>
                <Select
                  value={selectedWorkspace}
                  label="워크스페이스 선택"
                  onChange={(e: SelectChangeEvent) => setSelectedWorkspace(e.target.value)}
                  disabled={loading}
                >
                  {loading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      로딩 중...
                    </MenuItem>
                  ) : (
                    workspaces.map((workspace) => (
                      <MenuItem key={workspace.id} value={workspace.id}>
                        <Box>
                          <Typography variant="body1">{workspace.title}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            설문 {workspace.surveyCount}개 · 응답 {workspace.responseCount}개
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>설문 선택</InputLabel>
                <Select
                  value={selectedSurvey}
                  label="설문 선택"
                  onChange={(e: SelectChangeEvent) => setSelectedSurvey(e.target.value)}
                  disabled={!selectedWorkspace || loadingSurveys}
                >
                  {!selectedWorkspace ? (
                    <MenuItem disabled>먼저 워크스페이스를 선택하세요</MenuItem>
                  ) : loadingSurveys ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      설문 로딩 중...
                    </MenuItem>
                  ) : surveys.length === 0 ? (
                    <MenuItem disabled>설문이 없습니다</MenuItem>
                  ) : (
                    surveys.map((survey) => (
                      <MenuItem key={survey.id} value={survey.id}>
                        <Box>
                          <Typography variant="body1">{survey.title}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            응답 {survey.responseCount}개 · 상태: {survey.status === 'active' ? '활성' : survey.status === 'draft' ? '초안' : '비활성'}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                startIcon={<FileDownloadOutlined />}
                onClick={handleExport}
                disabled={!selectedWorkspace || !selectedSurvey || exporting}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {exporting ? '처리중...' : 'Excel 파일 생성'}
              </Button>

              <Alert severity="info" sx={{ mt: 2 }}>
                Export 작업은 백그라운드에서 처리되며, 완료되면 다운로드 링크가 제공됩니다.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Export 작업 현황 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Export 작업 현황
                </Typography>
                <Button
                  startIcon={<RefreshOutlined />}
                  onClick={loadExportJobs}
                  size="small"
                >
                  새로고침
                </Button>
              </Box>

              {exportJobs.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#6B7280', textAlign: 'center', py: 4 }}>
                  아직 Export 작업이 없습니다.
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {exportJobs.slice(0, 5).map((job) => (
                    <Box
                      key={job.id}
                      sx={{
                        p: 2,
                        border: '1px solid #F3F4F6',
                        borderRadius: 1,
                        mb: 1,
                        '&:last-child': { mb: 0 },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                          {job.workspaceName}
                        </Typography>
                        {getStatusChip(job.status)}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>
                        생성: {formatDate(job.createdAt)}
                        {job.completedAt && ` · 완료: ${formatDate(job.completedAt)}`}
                      </Typography>
                      {job.status === 'completed' && job.downloadUrl && (
                        <Button
                          size="small"
                          startIcon={<FileDownloadOutlined />}
                          onClick={() => handleDownload(job)}
                        >
                          다운로드
                        </Button>
                      )}
                      {job.status === 'failed' && job.errorMessage && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {job.errorMessage}
                        </Alert>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 전체 Export 작업 목록 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                전체 Export 작업 목록
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>워크스페이스</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>생성일시</TableCell>
                      <TableCell>완료일시</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exportJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.workspaceName}</TableCell>
                        <TableCell>{getStatusChip(job.status)}</TableCell>
                        <TableCell>{formatDate(job.createdAt)}</TableCell>
                        <TableCell>
                          {job.completedAt ? formatDate(job.completedAt) : '-'}
                        </TableCell>
                        <TableCell>
                          {job.status === 'completed' && job.downloadUrl ? (
                            <Button
                              size="small"
                              startIcon={<FileDownloadOutlined />}
                              onClick={() => handleDownload(job)}
                            >
                              다운로드
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExportResults;