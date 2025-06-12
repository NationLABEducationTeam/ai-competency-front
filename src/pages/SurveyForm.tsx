import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { assessmentAPI, surveyAPI, surveySubmissionAPI } from '../services/apiService';
import { AIAnalysisService } from '../services/aiAnalysisService';
import { SQSService } from '../services/sqsService';
import S3Service from '../services/s3Service';
import { useSurveyStore } from '../store/surveyStore';
import { useWorkspaceStore } from '../store/workspaceStore';

interface Question {
  id: string;
  text: string;
  category: string;
}

interface StudentInfo {
  name: string;
  organization: string;
  age: string;
  email: string;
  education: string;
  major: string;
}

const SurveyForm: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [searchParams] = useSearchParams();
  const { getSurveyById, updateSurveyResponses } = useSurveyStore();
  const { getWorkspaceById } = useWorkspaceStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    name: '',
    organization: '',
    age: '',
    email: '',
    education: '',
    major: '',
  });
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [survey, setSurvey] = useState<any>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 5;
  const totalPages = Math.ceil(allQuestions.length / questionsPerPage);

  // 인적사항 입력 에러 상태
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    organization: '',
    age: '',
    email: '',
    education: '',
    major: ''
  });

  // 현재 페이지의 문항들 계산 (수정된 부분)
  const currentQuestions = currentStep === 0 ? [] : allQuestions.slice(
    (currentStep - 1) * questionsPerPage,
    currentStep * questionsPerPage
  );

  // 카운트다운 상태
  const [countdown, setCountdown] = useState<number | null>(null);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // --- 진행률 표시 개선 로직 ---
  const mainSteps = ['인적사항 작성', '역량진단 설문', '진단 완료'];
  const activeMainStep = isCompleted ? 2 : (currentStep > 0 ? 1 : 0);

  const { progressValue, progressLabel } = useMemo(() => {
    if (activeMainStep === 0) {
      return {
        progressValue: 0, // Value for LinearProgress, but it won't be shown for this step
        progressLabel: '인적사항을 입력해주세요.'
      };
    }
    if (activeMainStep === 1) {
      const value = totalPages > 0 ? (currentStep / totalPages) * 100 : 0;
      return {
        progressValue: value,
        progressLabel: `역량진단 설문 (${currentStep}/${totalPages})`
      };
    }
    // '진단 완료' 단계
    return { progressValue: 100, progressLabel: '진단이 완료되었습니다.' };
  }, [activeMainStep, studentInfo, currentStep, totalPages]);
  // --- 종료 ---

  // 페이지 이탈 시 설문 중단 처리
  // 카운트다운 처리
  useEffect(() => {
    if (showFinalModal && countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showFinalModal && countdown === 0) {
      setShowFinalModal(false);
      window.location.href = '/thank-you';
    }
  }, [showFinalModal, countdown]);

  // 설문 데이터 로드
  useEffect(() => {
    const loadSurveyData = async () => {
      if (!surveyId) {
        console.log('❌ surveyId가 없음');
        setLoading(false);
        return;
      }
      
      console.log('🔍 SurveyForm - surveyId:', surveyId);
      
      try {
        setLoading(true);
        console.log('📡 백엔드 API 호출 시작...');
        
        try {
          const backendSurvey = await surveyAPI.getById(surveyId, true);
          console.log('✅ 백엔드 데이터 로드 성공:', backendSurvey);
          
          // 백엔드 데이터를 프론트엔드 형식으로 변환
          const defaultSurvey = getSurveyById('ai-competency-assessment');
          console.log('🔄 기본 설문 데이터:', defaultSurvey);
          
          const formattedSurvey = {
            id: backendSurvey.id,
            title: backendSurvey.title,
            description: backendSurvey.description || '',
            scoreScale: backendSurvey.scale_max,
            questions: defaultSurvey?.questions || [],
            link: backendSurvey.access_link || `/survey/${backendSurvey.id}`,
            createdAt: new Date(backendSurvey.created_at),
            isActive: backendSurvey.status === 'active',
            responses: 0,
          };
          
          console.log('📝 변환된 설문 데이터:', formattedSurvey);
          
          setSurvey(formattedSurvey);
          setAllQuestions((formattedSurvey.questions || []).map(q => ({
            id: q.id,
            text: q.text,
            category: q.category,
          })));
          console.log('📋 설정된 문항들:', allQuestions);
          
        } catch (backendError: any) {
          console.warn('⚠️ 백엔드 로드 실패:', backendError);
          console.log('🔄 로컬 스토어에서 시도...');
          
          const localSurvey = getSurveyById(surveyId);
          console.log('💾 로컬 스토어 데이터:', localSurvey);
          
          if (localSurvey) {
            console.log('✅ 로컬 스토어에서 설문 찾음');
            setSurvey(localSurvey);
            setAllQuestions(localSurvey.questions.map(q => ({
              id: q.id,
              text: q.text,
              category: q.category,
            })));
          } else {
            console.warn('⚠️ 로컬에서도 못찾음, 기본 설문 사용');
            
            const defaultSurvey = getSurveyById('ai-competency-assessment');
            console.log('🔄 기본 AI 역량 진단 설문:', defaultSurvey);
            
            if (defaultSurvey) {
              const fallbackSurvey = {
                ...defaultSurvey,
                id: surveyId,
                title: 'AI 기반 직무역량 자가진단 설문',
                description: 'AI/데이터 기본 이해부터 윤리 및 거버넌스까지 종합적인 AI 역량을 진단합니다',
              };
              
              console.log('📝 Fallback 설문 데이터:', fallbackSurvey);
              setSurvey(fallbackSurvey);
              setAllQuestions(fallbackSurvey.questions.map(q => ({
                id: q.id,
                text: q.text,
                category: q.category,
              })));
            } else {
              console.error('❌ 기본 설문도 못찾음');
              setSurvey(null);
            }
          }
        }
        
      } catch (error) {
        console.error('❌ 설문 로드 치명적 오류:', error);
        setSurvey(null);
      } finally {
        console.log('🏁 로딩 완료, 상태:', {
          survey: !!survey,
          questionsCount: allQuestions.length,
          loading: false
        });
        setLoading(false);
      }
    };

    loadSurveyData();
  }, [surveyId, getSurveyById]);

  // 설문 완료 처리
  const handleComplete = async () => {
    if (!surveyId || !submissionId) {
      console.error('Survey ID or Submission ID is missing for handleComplete');
      alert('오류: 설문 정보를 찾을 수 없습니다. 다시 시도해주세요.');
      return;
    }
    try {
      // 1. Submit answers and potentially trigger AI analysis (S3 save, etc.)
      await handleSubmitForAnalysis();

      // 2. Explicitly mark submission as 'completed' via API
      const completionTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : undefined;
      await surveySubmissionAPI.completeSubmission(surveyId, submissionId, {
        completion_status: 'completed',
        completion_time: completionTime,
      });
      console.log('✅ 설문 완료 상태 API 전송 성공');

      // 3. Update local state after successful API call
      setIsCompleted(true);
      setShowFinalModal(true);
      setCountdown(5);

    } catch (error) {
      console.error('설문 제출 또는 완료 처리 실패:', error);
      // Consider if a more specific error message or a retry for completeSubmission is needed
      alert('설문 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 설문 중단 처리
  const handleAbandon = async () => {
    if (submissionId && surveyId) {
      try {
        const completionTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : undefined;
        const response = await surveySubmissionAPI.completeSubmission(surveyId, submissionId, {
          completion_status: 'abandoned',
          completion_time: completionTime,
        });
        console.log('✅ 설문 중단 처리 성공:', response);
      } catch (error) {
        console.error('❌ 설문 중단 처리 실패:', error);
      }
    }
  };

  // 페이지 이탈 시 설문 중단 처리 (handleAbandon 뒤로 이동)
  useEffect(() => {
    if (submissionId) {
      const handleBeforeUnload = () => {
        // If survey is already marked as completed locally, do not call handleAbandon
        if (!isCompleted) {
          handleAbandon();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [submissionId, isCompleted, handleAbandon]);

  // 다음 단계로 이동
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 인적사항 입력 단계
        const validationError = validateStudentInfo();
        if (validationError) {
          alert(validationError);
          return;
        }

        if (!surveyId) {
          throw new Error('설문 ID가 없습니다.');
        }

        console.log('📝 설문 시작 로그 생성 시도...');
        // 설문 시작 로그 생성
        const startResponse = await surveySubmissionAPI.startSubmission(surveyId, {
          respondent_name: studentInfo.name,
          respondent_email: studentInfo.email,
        });
        
        if (!startResponse || !startResponse.submission_id) {
          throw new Error('설문 시작 응답이 올바르지 않습니다.');
        }

        console.log('✅ 설문 시작 로그 생성 성공:', startResponse);
        setSubmissionId(startResponse.submission_id);
        setStartTime(Date.now());
        setCurrentStep(currentStep + 1);
      } else if (currentStep < totalPages) {
        // 설문 응답 단계
        if (!isStepComplete()) {
          alert('모든 문항에 답변해주세요.');
          return;
        }
        setCurrentStep(currentStep + 1);
      } else {
        // 마지막 단계 - 설문 완료
        if (!submissionId || !surveyId) {
          throw new Error('설문 정보가 올바르지 않습니다.');
        }

        const completionTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : undefined;
        
        // 설문 완료 로그 업데이트 (모든 문항을 완료했으므로 completed 상태)
        const completeResponse = await surveySubmissionAPI.completeSubmission(surveyId, submissionId, {
          completion_status: 'completed',  // 모든 설문을 완료했으므로 completed
          completion_time: completionTime,
        });

        console.log('✅ 설문 완료 처리 성공:', completeResponse);
        
        setIsCompleted(true);
        setShowEmailModal(true);
      }
    } catch (error: any) {
      console.error('❌ 다음 단계 진행 중 오류:', error);
      alert(error.message || '다음 단계로 진행하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 단계 변경 시 항상 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // 로딩 상태 처리
  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Box sx={{ 
          textAlign: 'center',
          color: 'white'
        }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            🔍 설문을 불러오는 중...
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.8 }}>
            잠시만 기다려주세요
          </Typography>
        </Box>
      </Box>
    );
  }

  // 설문을 찾을 수 없는 경우
  if (!survey) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f7', py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              설문을 찾을 수 없습니다
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              유효하지 않은 설문 링크입니다.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              설문 ID: {surveyId}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.href = '/'}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                px: 4,
                py: 1.5,
                borderRadius: 2,
              }}
            >
              홈으로 돌아가기
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // const steps = ['개인정보', ...Array.from({ length: totalPages }, (_, i) => `단계 ${i + 1}`)]; // Deprecated by new mainSteps

  // 인적사항 입력 검증 함수 (필드별)
  const validateField = (field: keyof StudentInfo, value: string) => {
    if (!value.trim()) return '필수 입력 항목입니다.';
    if (field === 'age') {
      const ageNum = parseInt(value, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) return '나이는 1~120 사이의 숫자만 입력 가능합니다.';
    }
    if (field === 'email') {
      if (!/^\S+@\S+\.\S+$/.test(value.trim())) return '올바른 이메일 형식을 입력해주세요.';
    }
    return '';
  };

  // 입력값 변경 시 에러 메시지 갱신
  const handleStudentInfoChange = (field: keyof StudentInfo, value: string) => {
    setStudentInfo(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  // 전체 입력 검증 (다음 단계 버튼용)
  const validateStudentInfo = () => {
    let hasError = false;
    (Object.keys(studentInfo) as (keyof StudentInfo)[]).forEach(field => {
      const msg = validateField(field, studentInfo[field]);
      if (msg) hasError = true;
    });
    if (hasError) return '모든 항목을 올바르게 입력해주세요.';
    return '';
  };

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // 모든 입력 완료 여부 체크
  const isStepComplete = () => {
    if (currentStep === 0) {
      // 상태 변경 없이 값만 체크
      return (Object.keys(studentInfo) as (keyof StudentInfo)[]).every(field => !validateField(field, studentInfo[field]));
    }
    return currentQuestions.every(q => answers[q.id] !== undefined);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };



  // 공통 TextField 스타일
  const textFieldStyle = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: 'white',
      '&:hover fieldset': {
        borderColor: '#667eea',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#667eea',
        borderWidth: 2,
      }
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#667eea',
    }
  };

  // 설문 제출 및 AI 분석 요청 함수
  const handleSubmitForAnalysis = async () => {
    if (!survey?.id) {
      throw new Error('설문 ID가 없습니다');
    }

    // 1. 먼저 S3에 응답 데이터 저장 (AI 분석 없이)
    // 워크스페이스 정보를 더 안정적으로 가져오기
    let workspaceName = searchParams.get('workspace');
    
    // URL 파라미터에 없으면 설문 데이터나 기타 소스에서 시도
    if (!workspaceName) {
      // 설문 ID나 기타 정보에서 워크스페이스 추출 시도
      if (survey?.id && survey.id.includes('-')) {
        // 설문 ID가 "workspace-surveyname" 형태인 경우
        const parts = survey.id.split('-');
        if (parts.length > 1) {
          workspaceName = parts[0];
          console.log('📍 설문 ID에서 워크스페이스 추출:', workspaceName);
        }
      }
      
      // 여전히 없으면 학생 소속 정보 사용
      if (!workspaceName && studentInfo.organization) {
        workspaceName = studentInfo.organization.trim();
        console.log('📍 학생 소속에서 워크스페이스 설정:', workspaceName);
      }
      
      // 최후의 수단으로 default 사용
      if (!workspaceName) {
        workspaceName = 'default-workspace';
        console.warn('⚠️ 워크스페이스 정보를 찾을 수 없어 default 사용');
      }
    }
    
    // 설문 폴더명을 워크스페이스와 동일하게 설정 (URL 파라미터가 없을 때)
    let surveyFolderName = searchParams.get('survey');
    
    // URL 파라미터에 없으면 설문 데이터나 기타 소스에서 시도
    if (!surveyFolderName) {
      // 워크스페이스 이름과 동일하게 설정 (예: "숙명여대" → "숙명여대_AI역량진단")
      surveyFolderName = `${workspaceName}_AI역량진단`;
      console.log('📁 설문 폴더명을 워크스페이스 기반으로 생성:', surveyFolderName);
    }
    
    console.log('📂 S3 저장 경로:', {
      workspaceName,
      surveyFolderName,
      studentName: studentInfo.name.trim()
    });
    
    const s3ResponseData = {
      surveyId: survey.id,
      workspaceName: workspaceName,
      surveyFolderName: surveyFolderName,
      studentInfo: {
        name: studentInfo.name.trim(),
        organization: studentInfo.organization.trim(),
        age: parseInt(studentInfo.age, 10),
        email: studentInfo.email.trim(),
        education: studentInfo.education.trim(),
        major: studentInfo.major.trim(),
      },
      answers: Object.entries(answers).reduce((acc, [qId, score]) => {
        const question = allQuestions.find(q => q.id === qId);
        if (question) {
          acc[question.text] = score;
        }
        return acc;
      }, {} as { [key: string]: number }),
      submittedAt: new Date().toISOString(),
      filename: `${studentInfo.name.trim()}.json`,
      aiAnalysisStatus: 'pending' as 'pending' // AI 분석 상태 추가
    };

    // S3에 즉시 저장
    console.log('📤 S3에 응답 데이터 저장 시작...');
    const s3SaveResult = await S3Service.saveReport(s3ResponseData);
    
    if (!s3SaveResult.success) {
      console.error('❌ S3 저장 실패:', s3SaveResult.error);
      throw new Error('응답 저장에 실패했습니다.');
    }
    
    console.log('✅ S3 저장 성공:', s3SaveResult.s3Key);

    // 새로운 백엔드 API로 응답 전송
    try {
      const backendResponse = await surveyAPI.submitResponse(survey.id, {
        respondent_name: studentInfo.name.trim(),
        respondent_email: studentInfo.email.trim(),
        respondent_age: parseInt(studentInfo.age, 10),
        respondent_organization: studentInfo.organization.trim(),
        respondent_education: studentInfo.education.trim(),
        respondent_major: studentInfo.major.trim(),
        answers: Object.entries(answers).map(([questionId, score]) => ({
          question_id: questionId,
          score: score
        })),
      }, true);
      console.log('✅ 새로운 백엔드 응답 저장 성공:', backendResponse);
    } catch (backendError) {
      // 백엔드 API 실패는 무시하고 계속 진행
      console.warn('⚠️ 새로운 백엔드 API 저장 실패 (무시하고 계속):', backendError);
    }

    return s3SaveResult;
  };

  if (isCompleted) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}>
        <Container maxWidth="md">
          <Paper sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: 4,
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}>
            <Box sx={{ 
              mb: 4,
              animation: 'bounce 2s infinite',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': {
                  transform: 'translateY(0)',
                },
                '40%': {
                  transform: 'translateY(-10px)',
                },
                '60%': {
                  transform: 'translateY(-5px)',
                },
              }
            }}>
              <CheckCircle sx={{ fontSize: 120, color: '#48bb78', mb: 2 }} />
            </Box>
            
            <Typography variant="h2" sx={{ 
              fontWeight: 800, 
              mb: 3,
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              🎉 설문 완료!
            </Typography>
            
            <Typography variant="h5" sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: '#2d3748'
            }}>
              AI 역량 진단 설문이 성공적으로 완료되었습니다
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ 
              mb: 6,
              fontSize: '1.1rem',
              lineHeight: 1.6
            }}>
              소중한 시간을 내어 설문에 참여해 주셔서 진심으로 감사합니다.<br />
              결과는 관리자가 검토 후 이메일로 제공될 예정입니다.
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<span>📊</span>}
                sx={{
                  borderColor: '#48bb78',
                  color: '#48bb78',
                  textTransform: 'none',
                  px: 4,
                  py: 2,
                  borderRadius: 3,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#38a169',
                    backgroundColor: '#f0fff4',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setShowEmailModal(true)}
              >
                결과 보내기
              </Button>
            </Box>
            
            <Box sx={{ 
              mt: 6, 
              pt: 4, 
              borderTop: '1px solid #e2e8f0',
              color: 'text.secondary'
            }}>
              <Typography variant="caption" sx={{ fontSize: '0.9rem' }}>
                📧 결과는 입력하신 이메일로 발송됩니다 | ⏰ 보통 1-2일 소요
              </Typography>
            </Box>
          </Paper>
        </Container>

        {/* 이메일 수신 동의 모달 */}
        <Dialog 
          open={showEmailModal} 
          onClose={() => setShowEmailModal(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              maxWidth: '400px',
              width: '100%'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center',
            pt: 4,
            fontWeight: 700,
            fontSize: '1.5rem'
          }}>
            📧 AI 분석 결과 받기
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
              입력하신 이메일({studentInfo.email})로 AI 분석 결과를 보내드립니다.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              * 분석에는 약 1-2일이 소요될 수 있습니다.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
            <Button
              onClick={() => setShowEmailModal(false)}
              sx={{
                color: '#64748b',
                '&:hover': { backgroundColor: '#f1f5f9' }
              }}
            >
              취소
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                setShowEmailModal(false);
                setShowFinalModal(true);
                setCountdown(10);
                // 아래에서 비동기 작업 시작
                try {
                  // 🚀 SQS를 통한 비동기 AI 분석 요청!
                  console.log('📤 SQS를 통한 AI 분석 요청 시작!');
                  
                  // 워크스페이스 정보를 더 안정적으로 가져오기
                  let workspaceName = searchParams.get('workspace');
                  let surveyFolderName = searchParams.get('survey');
                  
                  console.log('🔍 URL 파라미터 확인:', {
                    workspace: searchParams.get('workspace'),
                    survey: searchParams.get('survey'),
                    surveyTitle: survey?.title,
                    surveyId: survey?.id
                  });
                  
                  // URL 파라미터에 없으면 설문 데이터나 기타 소스에서 시도
                  if (!workspaceName) {
                    // 설문 ID나 기타 정보에서 워크스페이스 추출 시도
                    if (survey?.id && survey.id.includes('-')) {
                      // 설문 ID가 "workspace-surveyname" 형태인 경우
                      const parts = survey.id.split('-');
                      if (parts.length > 1) {
                        workspaceName = parts[0];
                        console.log('📍 설문 ID에서 워크스페이스 추출:', workspaceName);
                      }
                    }
                    
                    // 여전히 없으면 학생 소속 정보 사용
                    if (!workspaceName && studentInfo.organization) {
                      workspaceName = studentInfo.organization.trim();
                      console.log('📍 학생 소속에서 워크스페이스 설정:', workspaceName);
                    }
                    
                    // 최후의 수단으로 default 사용
                    if (!workspaceName) {
                      workspaceName = 'default-workspace';
                      console.warn('⚠️ 워크스페이스 정보를 찾을 수 없어 default 사용');
                    }
                  }
                  
                  // 설문 폴더명을 워크스페이스와 동일하게 설정 (URL 파라미터가 없을 때)
                  if (!surveyFolderName) {
                    // 워크스페이스 이름과 동일하게 설정 (예: "숙명여대" → "숙명여대_AI역량진단")
                    surveyFolderName = `${workspaceName}_AI역량진단`;
                    console.log('📁 설문 폴더명을 워크스페이스 기반으로 생성:', surveyFolderName);
                  }
                  
                  console.log('📂 S3 저장 경로:', {
                    workspaceName,
                    surveyFolderName,
                    studentName: studentInfo.name.trim()
                  });
                  
                  // S3 키 생성 (이미 저장된 파일 경로)
                  const studentName = studentInfo.name.trim().replace(/[^a-zA-Z0-9가-힣]/g, '_');
                  const s3Key = `reports/${workspaceName}/${surveyFolderName}/${studentName}.json`;
                  
                  // 카테고리별 점수 계산
                  const categoryScores = [
                    { category: 'AI/데이터 기본 이해', score: 0, maxScore: 30, percentage: 0 },
                    { category: '문제 해결/적용 역량', score: 0, maxScore: 35, percentage: 0 },
                    { category: '데이터 이해 및 해석 능력', score: 0, maxScore: 30, percentage: 0 },
                    { category: 'AI 관련 협업/소통 능력', score: 0, maxScore: 30, percentage: 0 },
                    { category: 'AI/기술 트렌드 민감도', score: 0, maxScore: 40, percentage: 0 },
                  ];
                  
                  // 전체 점수 계산
                  const scores = Object.values(answers) as number[];
                  const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                  
                  // 카테고리별 점수 업데이트 (간단한 계산)
                  categoryScores.forEach(category => {
                    category.score = Math.round(overallScore * category.maxScore / 5);
                    category.percentage = Math.round((category.score / category.maxScore) * 100);
                  });
                  
                  // 답변을 문항 텍스트 기반으로 변환
                  const answersWithText: { [questionText: string]: number } = {};
                  Object.entries(answers).forEach(([qId, score]) => {
                    const question = allQuestions.find(q => q.id === qId);
                    if (question) {
                      answersWithText[question.text] = score;
                    }
                  });
                  
                  // SQS를 통한 비동기 AI 분석 요청
                  console.log('📤 SQS로 AI 분석 요청 전송 중...');
                  
                  // 임시 테스트: 실제 SQS에 메시지 전송 시도
                  console.log('🧪 실제 SQS 전송 테스트 시작...');
                  
                  // 1. Mock 테스트 (현재)
                  const mockResult = await SQSService.sendMockRequest({
                    studentInfo: {
                      name: studentInfo.name.trim(),
                      organization: studentInfo.organization.trim(),
                      age: parseInt(studentInfo.age, 10),
                      email: studentInfo.email.trim(),
                      education: studentInfo.education.trim(),
                      major: studentInfo.major.trim(),
                    },
                    answers: answersWithText,
                    categoryScores: categoryScores,
                    overallScore: overallScore,
                    workspaceName: workspaceName,
                    surveyFolderName: surveyFolderName,
                    surveyId: survey?.id,
                    submittedAt: new Date().toISOString(),
                    s3Key: s3Key
                  });
                  
                  console.log('✅ Mock 결과:', mockResult);
                  
                  // Mock 결과를 기준으로 처리
                  if (mockResult.success) {
                    console.log('✅ SQS 메시지 전송 성공:', mockResult.messageId);
                    console.log('🎯 AI 분석이 백그라운드에서 처리됩니다');
                  } else {
                    console.error('❌ SQS 메시지 전송 실패:', mockResult.error);
                  }
                  
                  // Lambda 직접 호출로 AI 분석 시작
                  console.log('🤖 Lambda 직접 호출로 AI 분석 시작...');
                  try {
                    const analysisResult = await AIAnalysisService.analyzeCompetency({
                      studentInfo: {
                        name: studentInfo.name.trim(),
                        organization: studentInfo.organization.trim(),
                        age: parseInt(studentInfo.age, 10),
                        email: studentInfo.email.trim(),
                        education: studentInfo.education.trim(),
                        major: studentInfo.major.trim(),
                      },
                      answers: answersWithText,
                      categoryScores: categoryScores,
                      overallScore: overallScore,
                      workspaceName: workspaceName,
                      surveyFolderName: surveyFolderName,
                      surveyId: survey?.id,
                      submittedAt: new Date().toISOString(),
                      s3Key: s3Key
                    });
                    
                    console.log('✅ Lambda AI 분석 완료:', analysisResult);
                    
                    // S3에 AI 분석 결과 다시 저장
                    const updatedData = {
                      surveyId: survey?.id,
                      workspaceName: workspaceName,
                      surveyFolderName: surveyFolderName,
                      studentInfo: {
                        name: studentInfo.name.trim(),
                        organization: studentInfo.organization.trim(),
                        age: parseInt(studentInfo.age, 10),
                        email: studentInfo.email.trim(),
                        education: studentInfo.education.trim(),
                        major: studentInfo.major.trim(),
                      },
                      answers: answersWithText,
                      submittedAt: new Date().toISOString(),
                      filename: `${studentInfo.name.trim()}.json`,
                      aiAnalysis: {
                        overallScore: overallScore,
                        categoryScores: categoryScores,
                        strengths: analysisResult.strengths,
                        weaknesses: analysisResult.weaknesses,
                        recommendations: analysisResult.recommendations,
                        summary: analysisResult.summary,
                        analyzedAt: new Date().toISOString()
                      },
                      aiAnalysisStatus: 'completed' as 'completed'
                    };
                    
                    console.log('📤 AI 분석 결과를 S3에 업데이트...');
                    await S3Service.saveReport(updatedData);
                    console.log('✅ S3 업데이트 완료');
                    
                  } catch (lambdaError) {
                    console.error('❌ Lambda AI 분석 실패:', lambdaError);
                    // Lambda 실패해도 설문은 정상 처리
                  }
                  
                  // SQS 전송 성공/실패와 관계없이 최종 모달 표시
                  setShowFinalModal(true);
                  setCountdown(10);
                  
                } catch (error) {
                  console.error('❌ SQS 요청 처리 실패:', error);
                  console.error('❌ 오류 상세:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    name: error instanceof Error ? error.name : 'Unknown'
                  });
                  
                  // 오류 발생해도 최종 모달 표시
                  setShowFinalModal(true);
                  setCountdown(10);
                }
              }}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                }
              }}
            >
              확인
            </Button>
          </DialogActions>
        </Dialog>

        {/* 최종 확인 모달 */}
        <Dialog 
          open={showFinalModal} 
          onClose={() => setShowFinalModal(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              maxWidth: '400px',
              width: '100%'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center',
            pt: 4,
            fontWeight: 700,
            fontSize: '1.5rem'
          }}>
            ✉️ 이메일 발송 예정
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
              결과 확인 중입니다. 잠시만 기다려주세요.<br />
              {countdown !== null && countdown > 0 && (
                <span style={{ fontWeight: 700, fontSize: '1.5rem', color: '#667eea' }}>{countdown}초</span>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              설문에 참여해 주셔서 감사합니다.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => {
                setShowFinalModal(false);
                window.location.href = '/thank-you';
              }}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                px: 4,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                }
              }}
            >
              설문 종료
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: { xs: 2, md: 4 }
    }}>
      <Container maxWidth="lg">
        <Paper sx={{ 
          p: { xs: 2, sm: 3, md: 4 }, 
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}>
          <Box sx={{ mb: { xs: 2, md: 4 } }}>
            {/* 헤더 섹션 */}
            <Box sx={{ 
              textAlign: 'center', 
              mb: { xs: 2, md: 4 },
              p: { xs: 2, md: 3 },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              color: 'white'
            }}>
              <Typography variant="h3" sx={{ 
                fontWeight: 700, 
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' }
              }}>
                {survey.title}
              </Typography>
              {/* <Typography variant="h6" sx={{ 
                opacity: 0.9,
                fontWeight: 400,
                lineHeight: 1.6,
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
              }}>
                {survey.description}
              </Typography> */}
            </Box>
            
            {/* --- 진행률 표시 개선 UI --- */}
            <Stepper activeStep={activeMainStep} alternativeLabel sx={{ mb: 2 }}>
              {mainSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ mb: 4, px: { xs: 0, sm: 4 } }}>
              {activeMainStep !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress variant="determinate" value={progressValue} sx={{ height: 8, borderRadius: 5 }} />
                  </Box>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(progressValue)}%`}</Typography>
                  </Box>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                {progressLabel}
              </Typography>
            </Box>
            {/* --- 종료 --- */}
          </Box>

          {currentStep === 0 ? (
            // 개인정보 입력 단계
            <Box sx={{ 
              p: { xs: 2, md: 4 }, 
              backgroundColor: '#fafbff', 
              borderRadius: 3,
              border: '2px solid #e0e7ff'
            }}>
              <Box sx={{ textAlign: 'center', mb: { xs: 2, md: 4 } }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  mb: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                }}>
                  👤 개인정보 입력
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
                  설문 참여를 위해 기본 정보를 입력해주세요
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(2, 1fr)', 
                  lg: 'repeat(3, 1fr)' 
                },
                gap: { xs: 2, md: 3 }
              }}>
                <Box>
                  <TextField
                    fullWidth
                    label="이름"
                    value={studentInfo.name}
                    onChange={(e) => handleStudentInfoChange('name', e.target.value)}
                    required
                    sx={textFieldStyle}
                    error={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      {fieldErrors.name}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="소속"
                    value={studentInfo.organization}
                    onChange={(e) => handleStudentInfoChange('organization', e.target.value)}
                    required
                    sx={textFieldStyle}
                    error={!!fieldErrors.organization}
                  />
                  {fieldErrors.organization && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      {fieldErrors.organization}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="나이"
                    type="number"
                    value={studentInfo.age}
                    onChange={(e) => handleStudentInfoChange('age', e.target.value)}
                    required
                    sx={textFieldStyle}
                    error={!!fieldErrors.age}
                  />
                  {fieldErrors.age && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      {fieldErrors.age}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="이메일"
                    type="email"
                    value={studentInfo.email}
                    onChange={(e) => handleStudentInfoChange('email', e.target.value)}
                    required
                    sx={textFieldStyle}
                    error={!!fieldErrors.email}
                  />
                  {fieldErrors.email && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      {fieldErrors.email}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <FormControl fullWidth required sx={textFieldStyle} error={!!fieldErrors.education}>
                    <InputLabel>학력</InputLabel>
                    <Select
                      value={studentInfo.education}
                      label="학력"
                      onChange={(e) => handleStudentInfoChange('education', e.target.value)}
                    >
                      <MenuItem value="고졸">🎓 고졸</MenuItem>
                      <MenuItem value="학사재학">📚 학사재학</MenuItem>
                      <MenuItem value="학사졸업">🎓 학사졸업</MenuItem>
                      <MenuItem value="석사재학">📖 석사재학</MenuItem>
                      <MenuItem value="석사졸업">🎓 석사졸업</MenuItem>
                      <MenuItem value="박사재학">📘 박사재학</MenuItem>
                      <MenuItem value="박사졸업">🎓 박사졸업</MenuItem>
                    </Select>
                  </FormControl>
                  {fieldErrors.education && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      {fieldErrors.education}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="학과"
                    value={studentInfo.major}
                    onChange={(e) => handleStudentInfoChange('major', e.target.value)}
                    required
                    sx={textFieldStyle}
                    error={!!fieldErrors.major}
                  />
                  {fieldErrors.major && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      {fieldErrors.major}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            // 설문 문항 단계
            <Box>
              <Box sx={{ 
                textAlign: 'center', 
                mb: { xs: 2, md: 4 },
                p: { xs: 2, md: 3 },
                backgroundColor: '#f0f4ff',
                borderRadius: 2,
                border: '1px solid #c7d2fe'
              }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  mb: 1,
                  color: '#4c51bf',
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                }}>
                  📝 문항 {Object.keys(answers).length} / {allQuestions.length}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
                  각 문항을 신중히 읽고 가장 적합한 답변을 선택해주세요
                </Typography>
              </Box>
              
              {currentQuestions.map((question, index) => (
                <Box key={question.id} sx={{ 
                  mb: { xs: 3, md: 4 },
                  p: { xs: 2, md: 3 },
                  backgroundColor: 'white',
                  borderRadius: 3,
                  border: '2px solid #f1f5f9',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  '&:hover': {
                    borderColor: '#e0e7ff',
                    boxShadow: '0 8px 15px rgba(0, 0, 0, 0.1)',
                  }
                }}>
                  <Box sx={{ mb: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      mb: 2,
                      color: '#1e293b',
                      lineHeight: 1.5,
                      fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.25rem' }
                    }}>
                      <Box component="span" sx={{ 
                        color: '#667eea', 
                        fontWeight: 700,
                        mr: 1
                      }}>
                        Q{(currentStep - 1) * questionsPerPage + index + 1}.
                      </Box>
                      {question.text}
                    </Typography>
                    <Box sx={{ 
                      display: 'inline-block',
                      px: 2, 
                      py: 0.5, 
                      backgroundColor: '#e0e7ff', 
                      borderRadius: 20,
                      mb: { xs: 2, md: 3 }
                    }}>
                      <Typography variant="caption" sx={{ 
                        color: '#4c51bf',
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', md: '0.75rem' }
                      }}>
                        📂 {question.category}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <FormControl component="fieldset" sx={{ width: '100%' }}>
                    {/* 모바일용 인라인 라디오 버튼 */}
                    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 2,
                        px: 1,
                        gap: 1
                      }}>
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.65rem',
                          color: '#64748b',
                          fontWeight: 500,
                          minWidth: '45px',
                          textAlign: 'center'
                        }}>
                          전혀 아니다
                        </Typography>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1.5,
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 1
                        }}>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Box
                              key={value}
                              onClick={() => handleAnswerChange(question.id, value)}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <Box sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                border: '2.5px solid',
                                borderColor: answers[question.id] === value ? '#667eea' : '#cbd5e1',
                                backgroundColor: answers[question.id] === value ? '#667eea' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                '&:hover': {
                                  borderColor: '#667eea',
                                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                                }
                              }}>
                                {answers[question.id] === value && (
                                  <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: 'white'
                                  }} />
                                )}
                              </Box>
                              <Typography variant="caption" sx={{
                                mt: 0.3,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: answers[question.id] === value ? '#667eea' : '#64748b'
                              }}>
                                {value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                        
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.65rem',
                          color: '#64748b',
                          fontWeight: 500,
                          minWidth: '45px',
                          textAlign: 'center'
                        }}>
                          매우 그렇다
                        </Typography>
                      </Box>
                    </Box>

                    {/* 데스크톱용 기존 박스 스타일 */}
                    <Box sx={{ 
                      display: { xs: 'none', md: 'grid' },
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 2,
                      mt: 3
                    }}>
                      {['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'].map((label, i) => (
                        <Box
                          key={i + 1}
                          onClick={() => handleAnswerChange(question.id, i + 1)}
                          sx={{ 
                            p: 2,
                            borderRadius: 3,
                            border: '3px solid',
                            borderColor: answers[question.id] === i + 1 ? '#667eea' : '#e2e8f0',
                            backgroundColor: answers[question.id] === i + 1 ? '#f0f4ff' : 'white',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            minHeight: '60px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            '&:hover': {
                              borderColor: '#667eea',
                              backgroundColor: '#f8faff',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.15)'
                            },
                            '&:active': {
                              transform: 'translateY(0)',
                            }
                          }}
                        >
                          <Radio 
                            checked={answers[question.id] === i + 1}
                            value={i + 1}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              color: '#cbd5e1',
                              '&.Mui-checked': {
                                color: '#667eea',
                              },
                              '& .MuiSvgIcon-root': {
                                fontSize: 24,
                              }
                            }}
                          />
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600,
                              color: answers[question.id] === i + 1 ? '#667eea' : '#64748b',
                              mb: 1,
                              fontSize: '1.25rem'
                            }}>
                              {i + 1}
                            </Typography>
                            
                            <Typography variant="body2" sx={{ 
                              color: answers[question.id] === i + 1 ? '#667eea' : '#64748b',
                              fontWeight: answers[question.id] === i + 1 ? 600 : 500,
                              lineHeight: 1.3,
                              fontSize: '0.875rem'
                            }}>
                              {label}
                            </Typography>
                          </Box>
                          
                          {answers[question.id] === i + 1 && (
                            <Box sx={{
                              position: 'absolute',
                              top: -2,
                              left: -2,
                              right: -2,
                              bottom: -2,
                              borderRadius: 3,
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              zIndex: -1,
                              opacity: 0.1
                            }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </FormControl>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: { xs: 4, md: 6 },
            p: { xs: 2, md: 3 },
            backgroundColor: '#f8faff',
            borderRadius: 2,
            border: '1px solid #e0e7ff',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Button
              onClick={handleBack}
              disabled={currentStep === 0}
              startIcon={<span>←</span>}
              sx={{ 
                textTransform: 'none',
                px: { xs: 2, md: 3 },
                py: 1.5,
                borderRadius: 2,
                color: '#64748b',
                fontSize: { xs: '0.9rem', md: '1rem' },
                '&:hover': {
                  backgroundColor: '#f1f5f9',
                  color: '#475569'
                },
                '&:disabled': {
                  color: '#cbd5e1'
                }
              }}
            >
              이전
            </Button>
            
            <Box sx={{ textAlign: 'center', order: { xs: -1, sm: 0 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                {currentStep === 0 
                  ? '개인정보를 모두 입력해주세요' 
                  : `${Object.keys(answers).length}/${allQuestions.length} 문항 완료`
                }
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepComplete()}
              endIcon={<span>{(activeMainStep === 1 && currentStep === totalPages) ? '✓' : '→'}</span>}
              sx={{
                background: isStepComplete() 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#e2e8f0',
                color: isStepComplete() ? 'white' : '#94a3b8',
                textTransform: 'none',
                px: { xs: 3, md: 4 },
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: { xs: '0.9rem', md: '1rem' },
                minWidth: { xs: '120px', md: 'auto' },
                boxShadow: isStepComplete() 
                  ? '0 4px 15px rgba(102, 126, 234, 0.4)' 
                  : 'none',
                '&:hover': {
                  background: isStepComplete() 
                    ? 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)' 
                    : '#e2e8f0',
                  boxShadow: isStepComplete() 
                    ? '0 6px 20px rgba(102, 126, 234, 0.6)' 
                    : 'none',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#94a3b8'
                }
              }}
            >
              {(activeMainStep === 1 && currentStep === totalPages) ? '설문 완료' : '다음 단계'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SurveyForm; 