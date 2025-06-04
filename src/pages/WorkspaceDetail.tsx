import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveyStore } from '../store/surveyStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { workspaceAPI, surveyAPI } from '../services/apiService';
import { SurveyCreate } from '../types';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  Assignment,
  People,
  Link as LinkIcon,
  Edit,
  Delete,
  Assessment,
  MoreVert,
  PlayArrow,
  Stop,
  Refresh,
  Archive,
  Unarchive,
} from '@mui/icons-material';
import SurveyCreator from '../components/SurveyCreator';
import S3Service, { SurveyResponse } from '../services/s3Service';

interface SurveyData {
  id: string;
  title: string;
  description: string;
  scoreScale: number;
  questionsCount: number;
  responses: number;
  isActive: boolean;
  link: string;
  createdAt: Date;
  status: string;
}

const WorkspaceDetail: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { surveys: allSurveys, addSurvey, getSurveyById } = useSurveyStore();
  const { getWorkspaceById } = useWorkspaceStore();
  const [openSurveyCreator, setOpenSurveyCreator] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<SurveyData | null>(null);
  const [openDeleteErrorDialog, setOpenDeleteErrorDialog] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [workspace, setWorkspace] = useState<any>(null);
  const [workspaceSurveys, setWorkspaceSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyData | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // 워크스페이스와 설문 데이터 로드
  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (!workspaceId) return;
      
      try {
        setLoading(true);
        
        // 먼저 활성 워크스페이스 목록에서 해당 워크스페이스가 있는지 확인
        const activeWorkspaces = await workspaceAPI.getAll();
        const isWorkspaceActive = activeWorkspaces.some(ws => ws.id === workspaceId);
        
        if (!isWorkspaceActive) {
          // 활성 워크스페이스 목록에 없으면 휴지통에 있는 것으로 간주
          setWorkspace({ 
            id: workspaceId, 
            title: '휴지통 워크스페이스', 
            isInTrash: true 
          });
          setLoading(false);
          return;
        }
        
        // 워크스페이스 정보 가져오기
        const workspaceData = await workspaceAPI.getById(workspaceId);
        setWorkspace(workspaceData);
        
        // 해당 워크스페이스의 설문 목록 가져오기
        const surveysData = await surveyAPI.getByWorkspace(workspaceId);
        
        // S3에서 워크스페이스의 모든 응답 데이터 가져오기
        const workspaceResponses = await S3Service.listWorkspaceReports(workspaceData.title);
        console.log('📊 워크스페이스 상세 - 전체 응답 수:', workspaceResponses.length);
        
        // 백엔드 데이터를 프론트엔드 형식으로 변환
        const formattedSurveys: SurveyData[] = await Promise.all(
          surveysData
            .filter(survey => survey.status !== 'draft' && survey.status !== 'inactive') // 보관된 설문과 휴지통 설문 제외
            .map(async (survey) => {
            // 1. 문항 수 계산 - surveyStore에서 가져오기
            let questionsCount = 0;
            const surveyFromStore = getSurveyById(survey.id);
            if (surveyFromStore && surveyFromStore.questions) {
              questionsCount = surveyFromStore.questions.length;
              console.log(`📋 설문 "${survey.title}" 문항 수 (Store):`, questionsCount);
            } else {
              // Store에 없으면 백엔드 questions 필드 확인
              if (survey.questions && Array.isArray(survey.questions)) {
                questionsCount = survey.questions.length;
                console.log(`📋 설문 "${survey.title}" 문항 수 (Backend):`, questionsCount);
              } else {
                // 기본 AI 역량 진단 설문인 경우
                if (survey.title.includes('AI') || survey.id === 'ai-competency-assessment') {
                  const defaultSurvey = getSurveyById('ai-competency-assessment');
                  questionsCount = defaultSurvey?.questions?.length || 33; // 기본 AI 설문 문항 수
                  console.log(`📋 설문 "${survey.title}" 기본 AI 설문 문항 수:`, questionsCount);
                }
              }
            }
            
            // 2. 응답 수 계산 - S3 데이터에서 해당 설문의 응답 수 계산
            const surveyResponses = workspaceResponses.filter((response: SurveyResponse) => {
              // 설문 ID 매칭 또는 설문 제목 매칭
              return response.surveyId === survey.id || 
                     response.workspaceName === workspaceData.title ||
                     response.surveyFolderName === survey.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_');
            });
            
            const responsesCount = surveyResponses.length;
            console.log(`📊 설문 "${survey.title}" 응답 수:`, responsesCount);
            
            return {
          id: survey.id,
          title: survey.title,
          description: survey.description || '',
          scoreScale: survey.scale_max,
              questionsCount: questionsCount,
              responses: responsesCount,
          isActive: survey.status === 'active',
          link: `/survey/${survey.id}?workspace=${encodeURIComponent(workspaceData.title)}&file=survey.xlsx`,
          createdAt: new Date(survey.created_at),
              status: survey.status,
            };
          })
        );
        
        console.log('📊 최종 설문 데이터:', formattedSurveys);
        setWorkspaceSurveys(formattedSurveys);
        
      } catch (err: any) {
        console.error('워크스페이스 데이터 로드 실패:', err);
        
        // 404 오류인 경우 휴지통에 있는 것으로 간주
        if (err.message.includes('404') || err.message.includes('찾을 수 없습니다')) {
          setWorkspace({ 
            id: workspaceId, 
            title: '휴지통 워크스페이스', 
            isInTrash: true 
          });
        } else if (err.message.includes('401')) {
          console.warn('인증 오류로 인해 Mock 데이터를 사용합니다.');
          const mockWorkspace = getWorkspaceById(workspaceId);
          if (mockWorkspace) {
            setWorkspace(mockWorkspace);
            // Mock 설문 데이터 (기존 Survey 타입이 변경되어 임시로 빈 배열 사용)
            const mockSurveys: SurveyData[] = [];
            setWorkspaceSurveys(mockSurveys);
          } else {
            showSnackbar('워크스페이스를 찾을 수 없습니다.', 'error');
          }
        } else {
          showSnackbar('워크스페이스 데이터를 불러오는데 실패했습니다.', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceData();
  }, [workspaceId, getWorkspaceById, allSurveys, getSurveyById]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // 워크스페이스를 찾을 수 없는 경우 또는 휴지통에 있는 경우
  if (!workspace) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
          워크스페이스를 찾을 수 없습니다.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/workspaces')}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
          }}
        >
          워크스페이스 목록으로 돌아가기
        </Button>
      </Box>
    );
  }

  // 워크스페이스가 휴지통에 있는 경우
  if (workspace.isInTrash) {
    return (
      <Box>
        {/* 브레드크럼 */}
        <Breadcrumbs sx={{ mb: 3 }} separator="/">
          <Link
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/workspaces');
            }}
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            워크스페이스
          </Link>
          <Typography color="text.primary">휴지통 워크스페이스</Typography>
        </Breadcrumbs>

        {/* 휴지통 안내 */}
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              backgroundColor: '#FEF3C7',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Archive sx={{ fontSize: 40, color: '#F59E0B' }} />
          </Box>
          
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 2 }}>
            이 워크스페이스는 휴지통에 있습니다
          </Typography>
          
          <Typography variant="body1" sx={{ color: '#6B7280', mb: 4, maxWidth: 500, mx: 'auto' }}>
            이 워크스페이스는 휴지통으로 이동되어 더 이상 접근할 수 없습니다.
            워크스페이스를 복구하려면 휴지통에서 복구하시기 바랍니다.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/workspaces')}
              sx={{
                textTransform: 'none',
                borderColor: '#D1D5DB',
                color: '#6B7280',
                '&:hover': {
                  borderColor: '#9CA3AF',
                  backgroundColor: '#F9FAFB',
                },
              }}
            >
              워크스페이스 목록
            </Button>
            
            <Button
              variant="contained"
              onClick={() => navigate('/trash')}
              sx={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                },
              }}
            >
              휴지통으로 이동
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // 로딩 상태 처리
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleCreateSurvey = async (surveyData: any): Promise<{ id: string; status: string }> => {
    try {
      setSubmitting(true);
      
      // 설문 기본 정보 생성
      const createData: SurveyCreate = {
        workspace_id: workspaceId!,
        title: surveyData.title,
        description: surveyData.description,
        scale_min: 1,
        scale_max: surveyData.scoreScale || 5,
        max_questions: surveyData.maxQuestions || 100,
        questions: surveyData.questions.map((q: any) => ({
          text: q.text,
          category: q.category,
          order: q.order
        }))
      };
      
      console.log('설문 생성 데이터:', createData);
      console.log('문항 수:', createData.questions?.length);
      
      const newSurvey = await surveyAPI.create(createData);
      
      // 업로드된 파일명 사용 (없으면 기본값)
      const fileName = surveyData.uploadedFileName || 'survey.xlsx';
      
      // S3 URL로 접근시에만 정적 웹사이트 URL 사용
      const baseUrl = window.location.hostname.includes('s3') 
        ? 'http://competency-surveys-platform.s3-website.ap-northeast-2.amazonaws.com'
        : window.location.origin;

      // 설문 링크 생성
      const surveyLink = `${baseUrl}/survey/${newSurvey.id}?workspace=${encodeURIComponent(workspace.title)}&file=${encodeURIComponent(fileName)}`;
      
      // surveyStore에도 설문 추가 (SurveyForm에서 찾을 수 있도록)
      const surveyForStore = {
        id: newSurvey.id,
        title: newSurvey.title,
        description: newSurvey.description || '',
        scoreScale: newSurvey.scale_max,
        questions: surveyData.questions || [], // SurveyCreator에서 전달받은 문항들
        link: surveyLink,
        createdAt: new Date(newSurvey.created_at),
        isActive: newSurvey.status === 'active',
        responses: 0,
      };
      
      addSurvey(surveyForStore);
      
      // 로컬 상태 업데이트
      const formattedSurvey: SurveyData = {
        id: newSurvey.id,
        title: newSurvey.title,
        description: newSurvey.description || '',
        scoreScale: newSurvey.scale_max,
        questionsCount: surveyData.questions?.length || 0,
        responses: 0, // 새로 생성된 설문이므로 응답 수는 0
        isActive: newSurvey.status === 'active',
        link: surveyLink,
        createdAt: new Date(newSurvey.created_at),
        status: newSurvey.status,
      };
      
      setWorkspaceSurveys(prev => [...prev, formattedSurvey]);
      
      // 생성 후 데이터 새로고침 (최신 상태 반영)
      setTimeout(() => {
        handleRefresh();
      }, 1000);
      
      return {
        id: newSurvey.id,
        status: newSurvey.status
      };
    } catch (error) {
      console.error('설문 생성 중 오류:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSurvey = (survey: SurveyData) => {
    setEditingSurvey(survey);
    setEditFormData({
      title: survey.title,
      description: survey.description,
    });
    setOpenEditDialog(true);
  };

  const handleUpdateSurvey = async () => {
    if (!editingSurvey || !editFormData.title.trim()) {
      showSnackbar('설문 제목을 입력해주세요.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      // 백엔드에 업데이트 요청 (현재 API에는 update 엔드포인트가 없으므로 로컬만 업데이트)
      // TODO: 백엔드에 설문 업데이트 API 추가 필요
      
      // 로컬 상태 업데이트
      setWorkspaceSurveys(prev => 
        prev.map(survey => 
          survey.id === editingSurvey.id 
            ? { ...survey, title: editFormData.title, description: editFormData.description }
            : survey
        )
      );
      
      showSnackbar('설문이 수정되었습니다.', 'success');
      setOpenEditDialog(false);
      setEditingSurvey(null);
    } catch (error: any) {
      console.error('설문 수정 실패:', error);
      showSnackbar('설문 수정에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSurvey = (survey: SurveyData) => {
    setDeletingSurvey(survey);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteSurvey = async () => {
    if (!deletingSurvey) return;

    try {
      setSubmitting(true);
      
      console.log('🗑️ 휴지통으로 이동 시작:', {
        surveyId: deletingSurvey.id,
        currentStatus: deletingSurvey.status,
        targetStatus: 'inactive'
      });
      
      // 휴지통으로 이동 (status를 'inactive'로 변경)
      const response = await surveyAPI.updateStatus(deletingSurvey.id, 'inactive');
      console.log('🗑️ 백엔드 응답:', response);
      
      // 로컬 상태에서 즉시 제거
      setWorkspaceSurveys(prev => {
        const filtered = prev.filter(survey => survey.id !== deletingSurvey.id);
        console.log('🗑️ 로컬 상태 업데이트:', {
          이전: prev.length,
          이후: filtered.length,
          제거된설문: deletingSurvey.title
        });
        return filtered;
      });
      
      showSnackbar('설문이 휴지통으로 이동되었습니다.', 'success');
      setOpenDeleteDialog(false);
      setDeletingSurvey(null);
      
      // 새로고침 제거 - 로컬 상태만 업데이트하여 즉시 반영
      // 사용자가 수동으로 새로고침하거나 페이지 이동 후 돌아올 때 반영됨
    } catch (error: any) {
      console.error('❌ 설문 휴지통 이동 실패:', error);
      showSnackbar('설문을 휴지통으로 이동하는데 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    // 상대경로를 절대경로로 변환 (구글폼처럼)
    const fullUrl = text.startsWith('http') ? text : `${window.location.origin}${text}`;
    
    // Clipboard API가 지원되는 경우
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl)
        .then(() => {
          showSnackbar('🔗 설문 링크가 클립보드에 복사되었습니다!', 'success');
        })
        .catch((error) => {
          console.error('클립보드 복사 실패:', error);
          fallbackCopyToClipboard(fullUrl);
        });
    } else {
      // Fallback 방식 사용
      fallbackCopyToClipboard(fullUrl);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    try {
      // 임시 textarea 엘리먼트 생성
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // execCommand 사용 (구형 브라우저 지원)
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showSnackbar('🔗 설문 링크가 클립보드에 복사되었습니다!', 'success');
      } else {
        throw new Error('execCommand 복사 실패');
      }
    } catch (error) {
      console.error('Fallback 복사 실패:', error);
      // 마지막 수단: 사용자에게 수동 복사 안내
      const message = `링크를 수동으로 복사해주세요:\n\n${text}`;
      if (window.prompt) {
        window.prompt(message, text);
      } else {
        alert(message);
      }
      showSnackbar('⚠️ 자동 복사가 지원되지 않습니다. 수동으로 복사해주세요.', 'error');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, survey: SurveyData) => {
    setAnchorEl(event.currentTarget);
    setSelectedSurvey(survey);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSurvey(null);
  };

  const handleMenuEdit = () => {
    if (selectedSurvey) {
      handleEditSurvey(selectedSurvey);
    }
    handleMenuClose();
  };

  const handleMenuDelete = () => {
    if (selectedSurvey) {
      handleDeleteSurvey(selectedSurvey);
    }
    handleMenuClose();
  };

  // 설문 활성화/비활성화 처리
  const handleStatusChange = async (surveyId: string, currentStatus: boolean) => {
    try {
      setIsActivating(true);
      const newStatus = currentStatus ? 'inactive' : 'active';
      
      await surveyAPI.updateStatus(surveyId, newStatus);
      
      // 로컬 상태 업데이트
      setWorkspaceSurveys(prev => prev.map(survey => 
        survey.id === surveyId 
          ? { ...survey, isActive: !currentStatus, status: newStatus }
          : survey
      ));
      
      showSnackbar(`설문이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`, 'success');

      // 보관함에서 복구(활성화)하는 경우 새로고침
      if (!currentStatus && selectedSurvey?.status === 'draft') {
        handleMenuClose(); // 메뉴 닫기
        setTimeout(() => {
          handleRefresh(); // 데이터 새로고침
        }, 500);
      }
    } catch (error) {
      console.error('설문 상태 변경 실패:', error);
      showSnackbar('설문 상태 변경에 실패했습니다.', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  // 설문 보관 처리
  const handleArchiveSurvey = async (surveyId: string) => {
    try {
      setSubmitting(true);
      await surveyAPI.archive(surveyId);
      
      // 로컬 상태 업데이트
      setWorkspaceSurveys(prev => prev.map(survey => 
        survey.id === surveyId 
          ? { ...survey, status: 'draft' }
          : survey
      ));
      
      showSnackbar('설문이 보관함으로 이동되었습니다.', 'success');
      setOpenDeleteDialog(false);
      setDeletingSurvey(null);
      handleMenuClose(); // 메뉴 닫기

      // 0.5초 후 데이터 새로고침
      setTimeout(() => {
        handleRefresh();
      }, 500);
    } catch (error) {
      console.error('설문 보관 처리 실패:', error);
      showSnackbar('설문 보관 처리에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 데이터 새로고침 함수
  const handleRefresh = async () => {
    if (!workspaceId) return;
    
    try {
      setLoading(true);
      console.log('🔄 워크스페이스 데이터 새로고침 시작');
      
      // 워크스페이스 정보 가져오기
      const workspaceData = await workspaceAPI.getById(workspaceId);
      setWorkspace(workspaceData);
      
      // 해당 워크스페이스의 설문 목록 가져오기
      const surveysData = await surveyAPI.getByWorkspace(workspaceId);
      
      // S3에서 워크스페이스의 모든 응답 데이터 가져오기
      const workspaceResponses = await S3Service.listWorkspaceReports(workspaceData.title);
      console.log('📊 워크스페이스 상세 - 전체 응답 수:', workspaceResponses.length);
      
      // 백엔드 데이터를 프론트엔드 형식으로 변환
      const formattedSurveys: SurveyData[] = await Promise.all(
        surveysData
          .filter(survey => survey.status !== 'draft' && survey.status !== 'inactive') // 보관된 설문과 휴지통 설문 제외
          .map(async (survey) => {
          // 1. 문항 수 계산 - surveyStore에서 가져오기
          let questionsCount = 0;
          const surveyFromStore = getSurveyById(survey.id);
          if (surveyFromStore && surveyFromStore.questions) {
            questionsCount = surveyFromStore.questions.length;
            console.log(`📋 설문 "${survey.title}" 문항 수 (Store):`, questionsCount);
          } else {
            // Store에 없으면 백엔드 questions 필드 확인
            if (survey.questions && Array.isArray(survey.questions)) {
              questionsCount = survey.questions.length;
              console.log(`📋 설문 "${survey.title}" 문항 수 (Backend):`, questionsCount);
            } else {
              // 기본 AI 역량 진단 설문인 경우
              if (survey.title.includes('AI') || survey.id === 'ai-competency-assessment') {
                const defaultSurvey = getSurveyById('ai-competency-assessment');
                questionsCount = defaultSurvey?.questions?.length || 33; // 기본 AI 설문 문항 수
                console.log(`📋 설문 "${survey.title}" 기본 AI 설문 문항 수:`, questionsCount);
              }
            }
          }
          
          // 2. 응답 수 계산 - S3 데이터에서 해당 설문의 응답 수 계산
          const surveyResponses = workspaceResponses.filter((response: SurveyResponse) => {
            // 설문 ID 매칭 또는 설문 제목 매칭
            return response.surveyId === survey.id || 
                   response.workspaceName === workspaceData.title ||
                   response.surveyFolderName === survey.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_');
          });
          
          const responsesCount = surveyResponses.length;
          
          return {
            id: survey.id,
            title: survey.title,
            description: survey.description || '',
            scoreScale: survey.scale_max,
            questionsCount: questionsCount,
            responses: responsesCount,
            isActive: survey.status === 'active',
            link: `/survey/${survey.id}?workspace=${encodeURIComponent(workspaceData.title)}&file=survey.xlsx`,
            createdAt: new Date(survey.created_at),
            status: survey.status,
          };
        })
      );
      
      setWorkspaceSurveys(formattedSurveys);
      showSnackbar('데이터가 새로고침되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 새로고침 실패:', error);
      showSnackbar('데이터 새로고침에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            color="inherit"
            href="#"
            onClick={() => navigate('/workspaces')}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            워크스페이스
          </Link>
          <Typography color="text.primary">{workspace.title}</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/workspaces')} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {workspace.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {workspace.description}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          설문 목록
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{
              borderColor: '#94a3b8',
              color: '#64748b',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': {
                borderColor: '#64748b',
                backgroundColor: '#f8fafc',
              },
            }}
          >
            새로고침
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assessment />}
            onClick={() => navigate(`/reports/${workspaceId}`)}
            sx={{
              borderColor: '#48bb78',
              color: '#48bb78',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': {
                borderColor: '#38a169',
                backgroundColor: '#f0fff4',
              },
            }}
          >
            리포트 보기
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenSurveyCreator(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              },
            }}
          >
            새로운 설문 등록하기
          </Button>
        </Box>
      </Box>

      {workspaceSurveys.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          backgroundColor: '#f8f9fa',
          borderRadius: 3,
          border: '2px dashed #e2e8f0'
        }}>
          <Assignment sx={{ fontSize: 64, color: '#cbd5e0', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            아직 설문이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            첫 번째 설문을 만들어서 학생들의 AI 역량을 진단해보세요
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenSurveyCreator(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              },
            }}
          >
            🚀 첫 설문 만들기
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {workspaceSurveys.map((survey) => (
          <Box key={survey.id} sx={{ flex: '1 1 350px', minWidth: '350px' }}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    flexGrow: 1,
                  }}>
                    {survey.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleStatusChange(survey.id, survey.isActive)}
                      disabled={isActivating}
                      startIcon={survey.isActive ? <Stop /> : <PlayArrow />}
                      color={survey.isActive ? 'error' : 'success'}
                      sx={{
                        textTransform: 'none',
                        minWidth: 'auto',
                        px: 1,
                      }}
                    >
                      {survey.isActive ? '비활성화' : '활성화'}
                    </Button>
                    <Chip
                      label={survey.isActive ? '활성' : '비활성'}
                      size="small"
                      color={survey.isActive ? 'success' : 'default'}
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {survey.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <People sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {survey.responses} 응답
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    점수 스케일: 1-{survey.scoreScale}
                  </Typography>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  p: 1, 
                  backgroundColor: '#f5f5f7', 
                  borderRadius: 1,
                  cursor: !survey.isActive ? 'not-allowed' : 'pointer',
                  border: '1px solid transparent',
                  opacity: !survey.isActive ? 0.6 : 1,
                  '&:hover': !survey.isActive ? {} : { 
                    backgroundColor: '#e8e8ea',
                    borderColor: '#667eea'
                  }
                }}
                onClick={(e) => {
                  if (!survey.isActive) {
                    e.preventDefault();
                    showSnackbar('비활성화된 설문의 링크는 복사할 수 없습니다.', 'error');
                    return;
                  }
                  copyToClipboard(survey.link);
                }}
                title={!survey.isActive ? '비활성화된 설문입니다' : '클릭하여 링크 복사'}
                >
                  <LinkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {survey.link.startsWith('http') ? survey.link : `${window.location.origin}${survey.link}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: !survey.isActive ? '#e53e3e' : '#667eea', fontSize: '10px' }}>
                    {!survey.isActive ? '링크 비활성화됨' : '📋 복사'}
                  </Typography>
                </Box>

                {/* 설문 접속 버튼들 */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {survey.isActive ? (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        const fullUrl = survey.link.startsWith('http') ? survey.link : `${window.location.origin}${survey.link}`;
                        window.open(fullUrl, '_blank');
                      }}
                      sx={{
                        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                        textTransform: 'none',
                        fontSize: '12px',
                        px: 2,
                        py: 0.5,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)',
                        },
                      }}
                    >
                      🚀 설문 시작하기
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      disabled
                      sx={{
                        background: '#e53e3e',
                        textTransform: 'none',
                        fontSize: '12px',
                        px: 2,
                        py: 0.5,
                        '&.Mui-disabled': {
                          background: '#e53e3e',
                          color: 'white',
                        },
                      }}
                    >
                      ⏸️ 설문 비활성화됨
                    </Button>
                  )}
                  
                  {/* 링크 복사 버튼 - 비활성화 상태에서는 비활성화 */}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (!survey.isActive) {
                        showSnackbar('비활성화된 설문의 링크는 복사할 수 없습니다.', 'error');
                        return;
                      }
                      copyToClipboard(survey.link);
                    }}
                    disabled={!survey.isActive}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      px: 2,
                      py: 0.5,
                      borderColor: '#667eea',
                      color: '#667eea',
                      opacity: !survey.isActive ? 0.6 : 1,
                      '&:hover': {
                        borderColor: '#5a67d8',
                        backgroundColor: '#f0f4ff',
                      },
                      '&.Mui-disabled': {
                        borderColor: '#cbd5e0',
                        color: '#718096',
                      }
                    }}
                  >
                    {!survey.isActive ? '링크 비활성화됨' : '📋 링크 복사'}
                  </Button>
                </Box>
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0, justifyContent: 'flex-end' }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, survey)}
                >
                  <MoreVert />
                </IconButton>
              </CardActions>
            </Card>
          </Box>
        ))}
        </Box>
      )}

      {/* 더보기 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleMenuEdit}>
          <Edit sx={{ mr: 1, fontSize: 18 }} />
          편집
        </MenuItem>
        <MenuItem onClick={() => handleArchiveSurvey(selectedSurvey?.id || '')} sx={{ color: 'warning.main' }}>
          <Archive sx={{ mr: 1, fontSize: 18 }} />
          보관함으로 이동
        </MenuItem>
        <MenuItem onClick={handleMenuDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 18 }} />
          휴지통으로 이동
        </MenuItem>
      </Menu>

      {/* 설문 생성 컴포넌트 */}
      <SurveyCreator
        open={openSurveyCreator}
        onClose={() => setOpenSurveyCreator(false)}
        onSave={handleCreateSurvey}
        workspaceName={workspace.title}
      />

      {/* 설문 편집 다이얼로그 */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>설문 편집</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="설문 제목"
            fullWidth
            variant="outlined"
            value={editFormData.title}
            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="설문 설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} disabled={submitting}>
            취소
          </Button>
          <Button 
            onClick={handleUpdateSurvey} 
            variant="contained"
            disabled={submitting}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {submitting ? <CircularProgress size={20} /> : '수정'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 설문 삭제 확인 다이얼로그 */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>설문을 휴지통으로 이동</DialogTitle>
        <DialogContent>
          <Typography>
            "{deletingSurvey?.title}" 설문을 휴지통으로 이동하시겠습니까?
            <br />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              휴지통으로 이동된 설문은 30일 후 자동으로 삭제됩니다.
              휴지통에서 언제든지 복구할 수 있습니다.
            </Typography>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={submitting}>
            취소
          </Button>
          <Button 
            onClick={confirmDeleteSurvey} 
            color="error" 
            variant="contained"
            disabled={submitting}
            startIcon={<Delete />}
          >
            {submitting ? <CircularProgress size={20} /> : '휴지통으로 이동'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 설문 삭제 에러 팝업 */}
      <Dialog 
        open={openDeleteErrorDialog} 
        onClose={() => setOpenDeleteErrorDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠️ 설문 삭제 불가
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {deleteErrorMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteErrorDialog(false)}
            variant="contained"
            sx={{
              bgcolor: '#e53e3e',
              '&:hover': {
                bgcolor: '#c53030',
              },
            }}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkspaceDetail; 