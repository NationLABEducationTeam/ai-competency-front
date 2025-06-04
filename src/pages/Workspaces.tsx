import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Chip,
  Snackbar,
} from '@mui/material';

import {
  Add,
  MoreVert,
  School,
  Assignment,
  People,
  Delete,
  Edit,
} from '@mui/icons-material';
import { useWorkspaceStore } from '../store/workspaceStore';
import { workspaceAPI, surveyAPI } from '../services/apiService';
import S3Service from '../services/s3Service';
import { Workspace } from '../types';

interface WorkspaceStats {
  surveyCount: number;
  responseCount: number;
}

const Workspaces: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace, setWorkspaces } = useWorkspaceStore();
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceStats, setWorkspaceStats] = useState<Record<string, WorkspaceStats>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    university_name: '',
  });

  // 워크스페이스별 통계 계산
  const calculateWorkspaceStats = async () => {
    try {
      console.log('📊 워크스페이스별 통계 계산 시작');
      
      // S3에서 모든 응답 데이터 가져오기
      const allResponses = await S3Service.listAllReports();
      console.log('📊 로드된 전체 응답 수:', allResponses.length);
      
      // 모든 설문 데이터 가져오기
      const allSurveys = await surveyAPI.getAll();
      console.log('📊 로드된 전체 설문 수:', allSurveys.length);
      
      // 워크스페이스별로 통계 집계
      const stats: Record<string, WorkspaceStats> = {};
      
      // 각 워크스페이스 초기화
      workspaces.forEach(workspace => {
        stats[workspace.title] = {
          surveyCount: 0,
          responseCount: 0
        };
      });
      
      // 설문 수 계산 (워크스페이스별)
      allSurveys.forEach(survey => {
        // survey.workspace_id를 통해 워크스페이스 찾기
        const workspace = workspaces.find(w => w.id === survey.workspace_id);
        if (workspace && stats[workspace.title]) {
          stats[workspace.title].surveyCount++;
        }
      });
      
      // 응답 수 계산 (워크스페이스명별)
      allResponses.forEach(response => {
        if (stats[response.workspaceName]) {
          stats[response.workspaceName].responseCount++;
        }
      });
      
      console.log('📊 계산된 워크스페이스 통계:', stats);
      setWorkspaceStats(stats);
      
    } catch (error) {
      console.error('워크스페이스 통계 계산 실패:', error);
    }
  };

  // 워크스페이스 목록 로드
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setLoading(true);
        const data = await workspaceAPI.getAll();
        setWorkspaces(data);
      } catch (error: any) {
        console.error('워크스페이스 로드 실패:', error);
        showSnackbar('워크스페이스를 불러오는데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [setWorkspaces]);

  // 워크스페이스 로드 후 통계 계산
  useEffect(() => {
    if (workspaces.length > 0) {
      calculateWorkspaceStats();
    }
  }, [workspaces]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, workspace: Workspace) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedWorkspace(workspace);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkspace(null);
  };

  const handleCreateWorkspace = () => {
    setEditingWorkspace(null);
    setFormData({ title: '', description: '', university_name: '' });
    setOpenDialog(true);
  };

  const handleEditWorkspace = () => {
    if (selectedWorkspace) {
      setEditingWorkspace(selectedWorkspace);
      setFormData({
        title: selectedWorkspace.title,
        description: selectedWorkspace.description || '',
        university_name: selectedWorkspace.university_name || '',
      });
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const handleDeleteWorkspace = () => {
    if (selectedWorkspace) {
      setWorkspaceToDelete(selectedWorkspace);
      setOpenDeleteDialog(true);
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!workspaceToDelete) return;

    try {
      setSubmitting(true);
      
      // 실제 삭제
      await workspaceAPI.delete(workspaceToDelete.id);
      
      // 로컬 상태에서 제거
      deleteWorkspace(workspaceToDelete.id);
      
      // 서버에서 최신 워크스페이스 목록 다시 로드
      try {
        const updatedWorkspaces = await workspaceAPI.getAll();
        setWorkspaces(updatedWorkspaces);
      } catch (reloadError) {
        console.error('워크스페이스 목록 재로드 실패:', reloadError);
      }
      
      showSnackbar('워크스페이스가 삭제되었습니다.', 'success');
      setOpenDeleteDialog(false);
      setWorkspaceToDelete(null);
      
      // 통계 재계산
      setTimeout(() => {
        calculateWorkspaceStats();
      }, 1000);
      
    } catch (error: any) {
      console.error('워크스페이스 삭제 실패:', error);
      showSnackbar('워크스페이스 삭제에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showSnackbar('워크스페이스 이름을 입력해주세요.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingWorkspace) {
        // 수정
        const updateData = {
          title: formData.title,
          description: formData.description || undefined,
          university_name: formData.university_name || undefined,
        };
        
        await workspaceAPI.update(editingWorkspace.id, updateData);
        
        // 로컬 상태 업데이트
        updateWorkspace(editingWorkspace.id, {
          ...editingWorkspace,
          title: formData.title,
          description: formData.description,
          university_name: formData.university_name,
          updated_at: new Date().toISOString(),
        });
        
        showSnackbar('워크스페이스가 수정되었습니다.', 'success');
      } else {
        // 생성
        const createData = {
          title: formData.title,
          description: formData.description || undefined,
          university_name: formData.university_name || undefined,
        };
        
        const newWorkspace = await workspaceAPI.create(createData);
        addWorkspace(newWorkspace);
        showSnackbar('워크스페이스가 생성되었습니다.', 'success');
      }
      
      setOpenDialog(false);
      setFormData({ title: '', description: '', university_name: '' });
      
      // 통계 재계산
      setTimeout(() => {
        calculateWorkspaceStats();
      }, 1000);
      
    } catch (error: any) {
      console.error('워크스페이스 저장 실패:', error);
      showSnackbar(
        editingWorkspace ? '워크스페이스 수정에 실패했습니다.' : '워크스페이스 생성에 실패했습니다.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            워크스페이스
          </Typography>
          <Typography variant="body1" color="text.secondary">
            프로젝트별로 설문을 관리하고 결과를 분석하세요
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateWorkspace}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            px: 3,
            py: 1.5,
            borderRadius: 2,
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
            },
          }}
        >
          새 워크스페이스
        </Button>
      </Box>

      {/* 고정 너비 카드 그리드 레이아웃 */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 280px)', // 5개 컬럼, 각각 280px 고정 너비
        gap: 3,
        justifyContent: 'start', // 왼쪽 정렬
        '@media (max-width: 1600px)': {
          gridTemplateColumns: 'repeat(4, 280px)', // 화면이 작으면 4개
        },
        '@media (max-width: 1280px)': {
          gridTemplateColumns: 'repeat(3, 280px)', // 더 작으면 3개
        },
        '@media (max-width: 960px)': {
          gridTemplateColumns: 'repeat(2, 280px)', // 더 작으면 2개
        },
        '@media (max-width: 640px)': {
          gridTemplateColumns: '1fr', // 모바일에서는 1개 (전체 너비)
        },
      }}>
        {workspaces.map((workspace) => {
          const stats = workspaceStats[workspace.title] || { surveyCount: 0, responseCount: 0 };
          
          return (
          <Card
            key={workspace.id}
            sx={{
              width: '100%',
              height: '240px', // 고정 높이
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
            onClick={() => navigate(`/workspaces/${workspace.id}`)}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <School sx={{ color: '#667eea', mr: 1, flexShrink: 0 }} />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {workspace.title}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  sx={{ flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuClick(e, workspace);
                  }}
                >
                  <MoreVert />
                </IconButton>
              </Box>
              
              {workspace.university_name && (
                <Chip
                  label={workspace.university_name}
                  size="small"
                  sx={{ 
                    mb: 2, 
                    backgroundColor: '#f0f4ff', 
                    color: '#667eea',
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }
                  }}
                />
              )}
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 3, 
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                }}
              >
                {workspace.description || '설명이 없습니다.'}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Assignment sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                      {stats.surveyCount} 설문
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                      {stats.responseCount} 응답
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          );
        })}
      </Box>

      {/* 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditWorkspace}>
          <Edit sx={{ mr: 1, fontSize: 18 }} />
          수정
        </MenuItem>
        <MenuItem onClick={handleDeleteWorkspace} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 18 }} />
          삭제
        </MenuItem>
      </Menu>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingWorkspace ? '워크스페이스 수정' : '새 워크스페이스 생성'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="워크스페이스 이름"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="대학교명"
            fullWidth
            variant="outlined"
            value={formData.university_name}
            onChange={(e) => setFormData({ ...formData, university_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={submitting}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {submitting ? <CircularProgress size={20} /> : (editingWorkspace ? '수정' : '생성')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 휴지통 이동 확인 다이얼로그 */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>워크스페이스 삭제</DialogTitle>
        <DialogContent>
          {workspaceToDelete && (
            <Box>
              <Typography sx={{ mb: 2 }}>
                "{workspaceToDelete.title}" 워크스페이스를 삭제하시겠습니까?
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                삭제된 워크스페이스는:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2, mb: 2 }}>
                • 목록에서 숨겨지며 대시보드 통계에서 제외됩니다<br />
                • 영구 삭제됩니다
          </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={submitting}>
            취소
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Workspaces;