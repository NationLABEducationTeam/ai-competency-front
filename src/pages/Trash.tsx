import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  RestoreOutlined,
  DeleteForeverOutlined,
  FolderOutlined,
  MoreVertOutlined,
  WarningAmberOutlined,
  InfoOutlined,
  Assignment,
  Archive,
  Unarchive,
  DeleteOutlined,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { workspaceAPI, surveyAPI } from '../services/apiService';

interface TrashedWorkspace {
  id: string;
  name: string;
  description?: string;
  deleted_at: string;
  surveys_count: number;
  responses_count: number;
}

interface ArchivedSurvey {
  id: string;
  title: string;
  description?: string;
  workspace_name: string;
  archived_at: string;
  responses_count: number;
  scale_max: number;
}

const Trash: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [workspaces, setWorkspaces] = useState<TrashedWorkspace[]>([]);
  const [surveys, setSurveys] = useState<ArchivedSurvey[]>([]);
  const [deletedSurveys, setDeletedSurveys] = useState<ArchivedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<TrashedWorkspace | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<ArchivedSurvey | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });

  const fetchTrashedData = async () => {
    try {
      setLoading(true);
      
      // 임시로 빈 워크스페이스 데이터
      setWorkspaces([]);
      
      // 1. 설문 휴지통 조회 (inactive 상태의 설문들)
      try {
        // 모든 워크스페이스 가져오기 (워크스페이스 이름 매핑용)
        const allWorkspaces = await workspaceAPI.getAll();
        const workspaceMap = new Map(allWorkspaces.map(ws => [ws.id, ws.title]));
        
        // 각 워크스페이스의 설문을 가져와서 inactive 필터링
        const allSurveyPromises = allWorkspaces.map(ws => surveyAPI.getByWorkspace(ws.id));
        const allSurveyArrays = await Promise.all(allSurveyPromises);
        const allSurveys = allSurveyArrays.flat();
        
        console.log('📥 모든 설문 데이터:', allSurveys);
        
        const inactiveSurveys = allSurveys.filter((survey: any) => survey.status === 'inactive');
        console.log('🗑️ 휴지통 설문 (inactive):', inactiveSurveys);
        
        const formattedDeletedSurveys = inactiveSurveys.map((survey: any) => ({
          id: survey.id,
          title: survey.title,
          description: survey.description || '',
          workspace_name: workspaceMap.get(survey.workspace_id) || '알 수 없는 워크스페이스',
          archived_at: survey.updated_at || survey.created_at,
          responses_count: survey.response_count || 0,
          scale_max: survey.scale_max || 5,
        }));
        setDeletedSurveys(formattedDeletedSurveys);
        console.log('🗑️ 휴지통 설문 개수:', formattedDeletedSurveys.length);
      } catch (error) {
        console.error('휴지통 설문 조회 실패:', error);
        setDeletedSurveys([]);
      }
      
      // 2. 설문 보관함 조회 - 워크스페이스 휴지통 API를 활용 (실제로는 설문 데이터)
      try {
        const workspaceResponse = await workspaceAPI.getTrashedWorkspaces();
        console.log('📥 설문 보관함 응답 (워크스페이스 API 활용):', workspaceResponse);
        
        // 응답 구조: {surveys: [...], total_count: number}
        const response = workspaceResponse as any; // 실제 응답 구조에 맞게 캐스팅
        const surveysData = response?.data?.surveys || response?.surveys || [];
        const formattedSurveys = surveysData.map((survey: any) => ({
          id: survey.id,
          title: survey.title,
          description: survey.description || '',
          workspace_name: survey.workspace_name || '알 수 없는 워크스페이스',
          archived_at: survey.updated_at || survey.created_at,
          responses_count: survey.response_count || 0,
          scale_max: survey.scale_max || 5,
        }));
        setSurveys(formattedSurveys);
        console.log('📋 보관함 설문 개수:', formattedSurveys.length);
      } catch (surveyError) {
        console.error('보관된 설문 조회 실패:', surveyError);
        setSurveys([]);
      }
      
    } catch (error: any) {
      console.error('휴지통 데이터 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '휴지통 데이터를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashedData();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: TrashedWorkspace | ArchivedSurvey, type: 'workspace' | 'survey') => {
    setAnchorEl(event.currentTarget);
    if (type === 'workspace') {
      setSelectedWorkspace(item as TrashedWorkspace);
      setSelectedSurvey(null);
    } else {
      setSelectedSurvey(item as ArchivedSurvey);
      setSelectedWorkspace(null);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkspace(null);
    setSelectedSurvey(null);
  };

  const handleRestoreWorkspace = async () => {
    if (!selectedWorkspace) return;

    try {
      setActionLoading(selectedWorkspace.id);
      await workspaceAPI.restoreWorkspace(selectedWorkspace.id);
      
      setSnackbar({
        open: true,
        message: `"${selectedWorkspace.name}" 워크스페이스가 복구되었습니다.`,
        severity: 'success',
      });
      
      setWorkspaces(prev => prev.filter(w => w.id !== selectedWorkspace.id));
    } catch (error: any) {
      console.error('워크스페이스 복구 실패:', error);
      setSnackbar({
        open: true,
        message: '워크스페이스 복구에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
      setRestoreConfirmOpen(false);
      handleMenuClose();
    }
  };

  const handleRestoreSurvey = async () => {
    if (!selectedSurvey) return;

    try {
      setActionLoading(selectedSurvey.id);
      console.log('📤 설문 복구 요청:', selectedSurvey.id);
      
      await surveyAPI.updateStatus(selectedSurvey.id, 'active');
      console.log('✅ 설문 복구 성공:', selectedSurvey.id);
      
      setSnackbar({
        open: true,
        message: `"${selectedSurvey.title}" 설문이 복구되었습니다.`,
        severity: 'success',
      });
      
      // 로컬 상태에서 즉시 제거 - 현재 탭에 따라 적절한 state 업데이트
      if (currentTab === 0) {
        // 설문 휴지통에서 복구
        setDeletedSurveys(prev => prev.filter(s => s.id !== selectedSurvey.id));
      } else {
        // 설문 보관함에서 복구
        setSurveys(prev => prev.filter(s => s.id !== selectedSurvey.id));
      }
      
      // 0.5초 후 데이터 새로고침하여 확실히 반영
      setTimeout(() => {
        fetchTrashedData();
        console.log('🔄 설문 복구 후 데이터 새로고침 완료');
      }, 500);
      
    } catch (error: any) {
      console.error('❌ 설문 복구 실패:', error);
      setSnackbar({
        open: true,
        message: `설문 복구에 실패했습니다: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
      setRestoreConfirmOpen(false);
      handleMenuClose();
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return;

    try {
      setActionLoading(selectedWorkspace.id);
      await workspaceAPI.deleteWorkspacePermanently(selectedWorkspace.id);
      
      setSnackbar({
        open: true,
        message: `"${selectedWorkspace.name}" 워크스페이스가 영구 삭제되었습니다.`,
        severity: 'success',
      });
      
      setWorkspaces(prev => prev.filter(w => w.id !== selectedWorkspace.id));
    } catch (error: any) {
      console.error('워크스페이스 영구 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '워크스페이스 영구 삭제에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
      setDeleteConfirmOpen(false);
      handleMenuClose();
    }
  };

  const handleDeleteSurvey = async () => {
    if (!selectedSurvey) return;

    try {
      setActionLoading(selectedSurvey.id);
      await surveyAPI.delete(selectedSurvey.id);
      
      setSnackbar({
        open: true,
        message: `"${selectedSurvey.title}" 설문이 영구 삭제되었습니다.`,
        severity: 'success',
      });
      
      // 로컬 상태에서 즉시 제거 - 현재 탭에 따라 적절한 state 업데이트
      if (currentTab === 0) {
        // 설문 휴지통에서 삭제
        setDeletedSurveys(prev => prev.filter(s => s.id !== selectedSurvey.id));
      } else {
        // 설문 보관함에서 삭제
        setSurveys(prev => prev.filter(s => s.id !== selectedSurvey.id));
      }
    } catch (error: any) {
      console.error('설문 영구 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '설문 영구 삭제에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
      setDeleteConfirmOpen(false);
      handleMenuClose();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
          휴지통 및 보관함
        </Typography>
        <Typography variant="body1" sx={{ color: '#6B7280' }}>
          삭제된 워크스페이스와 보관된 설문을 관리합니다. 30일 후 자동으로 영구 삭제됩니다.
        </Typography>
      </Box>

      {/* 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label={`설문 휴지통 (${deletedSurveys.length})`} />
          <Tab label={`설문 보관함 (${surveys.length})`} />
        </Tabs>
      </Box>

      {/* 안내 메시지 */}
      <Card sx={{ mb: 3, backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberOutlined sx={{ color: '#F59E0B', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: '#92400E' }}>
              {currentTab === 0 
                ? '휴지통의 워크스페이스는 30일 후 자동으로 영구 삭제됩니다.' 
                : '보관된 설문은 언제든지 복구할 수 있습니다.'
              }
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 컨텐츠 */}
      {currentTab === 0 ? (
        // 설문 휴지통
        deletedSurveys.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <DeleteOutlined sx={{ fontSize: 64, color: '#9CA3AF', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
                휴지통이 비어있습니다
              </Typography>
              <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                삭제된 설문이 없습니다.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {deletedSurveys.map((survey) => (
              <Card
                key={survey.id}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FEF2F2',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ flex: 1, p: 3 }}>
                  {/* 헤더 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: '#FCA5A5',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DeleteOutlined sx={{ color: '#DC2626', fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: '#111827',
                            fontSize: '1.1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {survey.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6B7280',
                            display: 'block',
                          }}
                        >
                          {survey.workspace_name}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, survey, 'survey')}
                      disabled={actionLoading === survey.id}
                      sx={{ color: '#6B7280' }}
                    >
                      {actionLoading === survey.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <MoreVertOutlined fontSize="small" />
                      )}
                    </IconButton>
                  </Box>

                  {/* 설명 */}
                  {survey.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#6B7280',
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {survey.description}
                    </Typography>
                  )}

                  {/* 통계 */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={`점수 스케일 1-${survey.scale_max}`}
                      size="small"
                      sx={{ backgroundColor: '#FCA5A5', color: '#DC2626' }}
                    />
                    <Chip
                      label={`응답 ${survey.responses_count}개`}
                      size="small"
                      sx={{ backgroundColor: '#FCA5A5', color: '#DC2626' }}
                    />
                  </Stack>

                  {/* 삭제 시간 */}
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                    {formatDistanceToNow(new Date(survey.archived_at), {
                      addSuffix: true,
                      locale: ko,
                    })} 삭제됨
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )
      ) : (
        // 설문 보관함
        surveys.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <Archive sx={{ fontSize: 64, color: '#9CA3AF', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
                보관함이 비어있습니다
              </Typography>
              <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                보관된 설문이 없습니다.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {surveys.map((survey) => (
              <Card
                key={survey.id}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFF8F0',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ flex: 1, p: 3 }}>
                  {/* 헤더 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: '#FED7AA',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Assignment sx={{ color: '#EA580C', fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: '#111827',
                            fontSize: '1.1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {survey.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6B7280',
                            display: 'block',
                          }}
                        >
                          {survey.workspace_name}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, survey, 'survey')}
                      disabled={actionLoading === survey.id}
                      sx={{ color: '#6B7280' }}
                    >
                      {actionLoading === survey.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <MoreVertOutlined fontSize="small" />
                      )}
                    </IconButton>
                  </Box>

                  {/* 설명 */}
                  {survey.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#6B7280',
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {survey.description}
                    </Typography>
                  )}

                  {/* 통계 */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={`점수 스케일 1-${survey.scale_max}`}
                      size="small"
                      sx={{ backgroundColor: '#FED7AA', color: '#EA580C' }}
                    />
                    <Chip
                      label={`응답 ${survey.responses_count}개`}
                      size="small"
                      sx={{ backgroundColor: '#FED7AA', color: '#EA580C' }}
                    />
                  </Stack>

                  {/* 보관 시간 */}
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                    {formatDistanceToNow(new Date(survey.archived_at), {
                      addSuffix: true,
                      locale: ko,
                    })} 보관됨
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )
      )}

      {/* 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem
          onClick={() => {
            setRestoreConfirmOpen(true);
            // handleMenuClose(); // 메뉴를 닫으면 selectedSurvey가 null이 되므로 주석 처리
            setAnchorEl(null); // 메뉴만 닫기
          }}
        >
          <ListItemIcon>
            <RestoreOutlined fontSize="small" sx={{ color: '#059669' }} />
          </ListItemIcon>
          <ListItemText>복구</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setDeleteConfirmOpen(true);
            // handleMenuClose(); // 메뉴를 닫으면 selectedSurvey가 null이 되므로 주석 처리
            setAnchorEl(null); // 메뉴만 닫기
          }}
          sx={{ color: '#DC2626' }}
        >
          <ListItemIcon>
            <DeleteForeverOutlined fontSize="small" sx={{ color: '#DC2626' }} />
          </ListItemIcon>
          <ListItemText>영구 삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* 복구 확인 다이얼로그 */}
      <Dialog open={restoreConfirmOpen} onClose={() => {
        setRestoreConfirmOpen(false);
        setSelectedWorkspace(null);
        setSelectedSurvey(null);
      }}>
        <DialogTitle>
          {selectedWorkspace ? '워크스페이스 복구' : '설문 복구'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            "{selectedWorkspace?.name || selectedSurvey?.title}"을(를) 복구하시겠습니까?
            <br />
            복구된 {selectedWorkspace ? '워크스페이스는 다시 활성 상태가' : '설문은 다시 활성 상태로'} 됩니다.
          </Typography>
          {selectedSurvey && (
            <Typography variant="body2" sx={{ mt: 2, color: '#6B7280' }}>
              💡 복구된 설문은 "{selectedSurvey.workspace_name}" 워크스페이스에서 확인할 수 있습니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRestoreConfirmOpen(false);
            setSelectedWorkspace(null);
            setSelectedSurvey(null);
          }}>취소</Button>
          <Button 
            variant="contained" 
            onClick={selectedWorkspace ? handleRestoreWorkspace : handleRestoreSurvey} 
            sx={{ backgroundColor: '#059669' }}
          >
            복구
          </Button>
        </DialogActions>
      </Dialog>

      {/* 영구 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmOpen} onClose={() => {
        setDeleteConfirmOpen(false);
        setSelectedWorkspace(null);
        setSelectedSurvey(null);
      }}>
        <DialogTitle sx={{ color: '#DC2626' }}>영구 삭제</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            "{selectedWorkspace?.name || selectedSurvey?.title}"을(를) <strong>영구적으로 삭제</strong>하시겠습니까?
          </Typography>
          <Typography variant="body2" sx={{ color: '#DC2626' }}>
            ⚠️ 이 작업은 되돌릴 수 없으며, 모든 데이터가 완전히 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteConfirmOpen(false);
            setSelectedWorkspace(null);
            setSelectedSurvey(null);
          }}>취소</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={selectedWorkspace ? handleDeleteWorkspace : handleDeleteSurvey}
          >
            영구 삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Trash; 