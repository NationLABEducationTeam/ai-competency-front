import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI } from '../services/apiService';
import { generateReportPDF, generateMultipleReportsPDF } from '../utils/pdfGenerator';
import { AIAnalysisService } from '../services/aiAnalysisService';
import { API_CONFIG } from '../config/api';
import {
  Box,
  Typography,
  Paper,
  Button,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Container,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  Person,
  School,
  CheckBox,
  CheckBoxOutlineBlank,
  Visibility,
  Assessment,
  Group,
  FileDownload,
  AutoAwesome,
  Refresh,
  Email,
} from '@mui/icons-material';
import AIAnalysisModal from '../components/AIAnalysisModal';

interface StudentResponse {
  studentName: string;
  workspaceName: string;
  surveyFolderName: string;
  s3Key?: string;
  studentInfo: {
    name: string;
    organization: string;
    age: number;
    email: string;
    education: string;
    major: string;
    department?: string;
    position?: string;
  };
  answers: { [questionText: string]: number };
  submittedAt: string;
  overallScore: number;
  categoryScores: Array<{
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  analysis?: {
    overall_score: number;
    competency_level: string;
    category_scores: {
      [key: string]: {
        score: number;
        level: string;
      };
    };
    strengths: string[];
    improvement_areas: string[];
    recommendations: {
      immediate_actions: string[];
      learning_resources: string[];
      skill_development_path: string;
    };
    comprehensive_summary: string;
    detailed_report: {
      current_position: string;
      growth_potential: string;
      key_insights: string[];
    };
  };
  aiAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    summary: string;
  };
}

interface WorkspaceStudents {
  [workspaceName: string]: StudentResponse[];
}

// 새로운 백엔드 API를 사용한 데이터 타입 정의
interface WorkspaceInfo {
  name: string;
  surveys: SurveyInfo[];
}

interface SurveyInfo {
  survey_name: string;
  original_results_count: number;
  ai_results_count: number;
  total_students: number;
}

interface AIResult {
  student_name: string;
  file_key: string;
  size: number;
  last_modified: string;
  download_url: string;
  data?: any; // 다운로드한 실제 데이터
}

const Reports: React.FC = () => {
  const { workspaceId, surveyId } = useParams<{ workspaceId: string; surveyId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // URL 파라미터 기반 현재 단계 결정
  const getCurrentStep = () => {
    if (!workspaceId) return 'workspace-selection';
    if (!surveyId) return 'survey-selection';
    return 'student-results';
  };
  
  const currentStep = getCurrentStep();
  
  // 새로운 백엔드 API 데이터 구조
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(workspaceId || '');
  const [workspaceSurveys, setWorkspaceSurveys] = useState<SurveyInfo[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>(surveyId || '');
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  const [studentData, setStudentData] = useState<StudentResponse[]>([]);
  
  // 기존 UI 상태
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentResponse | null>(null);
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [selectedStudentForAI, setSelectedStudentForAI] = useState<StudentResponse | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDialogInfo, setEmailDialogInfo] = useState<{ name: string; email: string; pdfPath: string } | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<string | null>(null);

  // URL 파라미터에 따른 데이터 로드
  useEffect(() => {
    const loadDataBasedOnURL = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1단계: 워크스페이스 목록 항상 로드
        console.log('📋 1단계: 워크스페이스 목록 로드 시작');
        const workspaceResult = await reportAPI.getWorkspaces();
        setWorkspaces(workspaceResult.workspaces);
        console.log('✅ 워크스페이스 목록 로드 완료:', workspaceResult.workspaces);
        
        // 2단계: 워크스페이스가 선택된 경우 설문 목록 로드
        if (workspaceId) {
          console.log('📋 2단계: 워크스페이스 설문 목록 로드 시작:', workspaceId);
          const surveyResult = await reportAPI.getSurveysByWorkspace(workspaceId);
          setWorkspaceSurveys(surveyResult.surveys);
          console.log('✅ 워크스페이스 설문 목록 로드 완료:', surveyResult.surveys);
        }
        
        // 3단계: 설문이 선택된 경우 AI 결과 로드
        if (workspaceId && surveyId) {
          console.log('📋 3단계: AI 결과 로드 시작:', { workspaceId, surveyId });
          const aiResult = await reportAPI.getAIResults(workspaceId, surveyId);
          setAiResults(aiResult.ai_results);
          
          // 각 AI 결과 파일의 실제 데이터를 다운로드하고 StudentResponse 형태로 변환
          const studentResponses: StudentResponse[] = [];
          
          for (const result of aiResult.ai_results) {
            try {
              console.log('📥 AI 결과 파일 다운로드:', result.student_name);
              const data = await reportAPI.downloadAIResult(result.download_url);
              
              // 다운로드한 데이터를 StudentResponse 형태로 변환
              const studentResponse: StudentResponse = {
                studentName: result.student_name,
                workspaceName: workspaceId,
                surveyFolderName: surveyId,
                s3Key: result.file_key,
                studentInfo: data.studentInfo || {
                  name: result.student_name,
                  organization: data.studentInfo?.organization || '',
                  age: data.studentInfo?.age || 0,
                  email: data.studentInfo?.email || '',
                  education: data.studentInfo?.education || '',
                  major: data.studentInfo?.major || '',
                },
                answers: data.answers || {},
                submittedAt: data.submittedAt || result.last_modified,
                overallScore: data.analysis?.overall_score || data.aiAnalysis?.overallScore || 0,
                categoryScores: convertCategoryScores(data),
                analysis: data.analysis,
                aiAnalysis: data.aiAnalysis
              };
              
              studentResponses.push(studentResponse);
              console.log('✅ 학생 데이터 변환 완료:', result.student_name);
            } catch (err) {
              console.error('❌ AI 결과 파일 처리 실패:', result.student_name, err);
            }
          }
          
          setStudentData(studentResponses);
          console.log('✅ AI 결과 로드 완료:', studentResponses.length, '명');
        }
        
      } catch (err) {
        console.error('❌ 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadDataBasedOnURL();
  }, [workspaceId, surveyId]);

  const handleStudentSelect = (studentKey: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentKey)) {
      newSelected.delete(studentKey);
    } else {
      newSelected.add(studentKey);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = (workspaceName: string) => {
    const students = studentData.filter(s => s.workspaceName === workspaceName);
    const studentKeys = students.map(s => `${workspaceName}-${s.studentName}`);
    
    const allSelected = studentKeys.every(key => selectedStudents.has(key));
    const newSelected = new Set(selectedStudents);
    
    if (allSelected) {
      // 모두 선택되어 있으면 해제
      studentKeys.forEach(key => newSelected.delete(key));
    } else {
      // 일부만 선택되어 있거나 없으면 모두 선택
      studentKeys.forEach(key => newSelected.add(key));
    }
    
    setSelectedStudents(newSelected);
  };

  const handleStudentDetail = async (student: StudentResponse) => {
    try {
      setSelectedStudentDetail(student);
      setDetailDialogOpen(true);
      
      // AI 분석이 없으면 기본 분석 생성 (Lambda 호출 안함)
      if (!student.aiAnalysis && !student.analysis) {
        console.log('⚠️ 상세 보기용 기본 분석 생성 (S3에 저장된 결과 없음):', student.studentName);
        
        // Lambda 호출 대신 기본 AI 분석 생성
        const aiAnalysis = generateBasicAIAnalysis(student);
        
        // 학생 데이터에 AI 분석 결과 추가
        const updatedStudent = { ...student, aiAnalysis };
        setSelectedStudentDetail(updatedStudent);
        
        console.log('✅ 상세 보기용 기본 분석 완료:', student.studentName);
      } else {
        console.log('✅ S3에 저장된 AI 분석 결과 사용:', student.studentName);
      }
    } catch (error) {
      console.error('❌ AI 분석 실패:', error);
      // 오류가 발생해도 다이얼로그는 열어줌
      setSelectedStudentDetail(student);
      setDetailDialogOpen(true);
    }
  };

  const handleAIAnalysis = (student: StudentResponse) => {
    setSelectedStudentForAI(student);
    setAiAnalysisModalOpen(true);
  };

  const handleDownloadIndividualPDF = async (student: StudentResponse) => {
    try {
      console.log('📄 개별 PDF 생성 시작:', student.studentName);
      
      // AI 분석 결과 확인 및 변환
      let aiAnalysis;
      
      // 새로운 analysis 구조 우선 확인
      if (student.analysis) {
        console.log('✅ 새로운 Lambda AI 분석 결과 사용 (PDF):', student.studentName);
        // 새로운 구조를 기존 형식으로 변환
        aiAnalysis = {
          strengths: student.analysis.strengths,
          weaknesses: student.analysis.improvement_areas,
          recommendations: [
            ...student.analysis.recommendations.immediate_actions,
            ...student.analysis.recommendations.learning_resources
          ],
          summary: student.analysis.comprehensive_summary
        };
      } else if (student.aiAnalysis) {
        console.log('✅ 기존 AI 분석 결과 사용 (PDF):', student.studentName);
        aiAnalysis = student.aiAnalysis;
      } else {
        console.log('⚠️ AI 분석 결과 없음, 기본 분석 생성:', student.studentName);
        aiAnalysis = generateBasicAIAnalysis(student);
      }
      
      // Report 형식으로 변환
      const studentInfo = {
        name: student.studentInfo.name ?? '',
        email: student.studentInfo.email ?? '',
        age: student.studentInfo.age !== undefined ? student.studentInfo.age.toString() : '',
        organization: student.studentInfo.organization ?? student.studentInfo.department ?? '',
        major: student.studentInfo.major ?? '',
        education: student.studentInfo.education ?? '',
        position: student.studentInfo.position ?? '',
        department: student.studentInfo.department ?? '',
      };

      const report = {
        id: `${student.workspaceName}-${student.studentName}`,
        studentId: student.studentName,
        surveyId: 'ai-competency',
        workspaceId: student.workspaceName,
        responseId: `response-${student.studentName}`,
        studentInfo: studentInfo,
        responses: [],
        overallScore: student.overallScore,
        categoryScores: student.categoryScores.map(cat => ({
          ...cat,
          level: cat.percentage >= 80 ? 'excellent' as const : cat.percentage >= 60 ? 'good' as const : 'needs_improvement' as const
        })),
        aiAnalysis: aiAnalysis,  // 변환된 AI 분석 결과 사용
        generatedAt: new Date()
      };
      
      await generateReportPDF(report);
      console.log('✅ 개별 PDF 생성 완료:', student.studentName);
    } catch (error) {
      console.error('❌ PDF 생성 실패:', error);
      alert(`PDF 생성 중 오류가 발생했습니다: ${error}`);
    }
  };

  // 기본 AI 분석 생성 함수 (Lambda 호출 없이)
  const generateBasicAIAnalysis = (student: StudentResponse) => {
    const avgScore = student.overallScore;
    
    // 점수 기반 기본 분석
    const getBasicStrengths = (score: number) => {
      if (score >= 4.0) {
        return [
          "AI 기술에 대한 전반적인 이해도가 우수합니다",
          "실무 적용 능력이 뛰어납니다",
          "지속적인 학습 의지가 강합니다"
        ];
      } else if (score >= 3.0) {
        return [
          "AI 기본 개념을 잘 이해하고 있습니다",
          "실무 적용에 대한 관심이 높습니다",
          "새로운 기술 학습에 적극적입니다"
        ];
      } else {
        return [
          "AI 기술에 대한 관심과 학습 의지가 있습니다",
          "기초적인 이해를 바탕으로 성장 가능성이 높습니다",
          "체계적인 학습을 통해 발전할 수 있습니다"
        ];
      }
    };

    const getBasicWeaknesses = (score: number) => {
      if (score >= 4.0) {
        return [
          "더욱 전문적인 AI 기술 영역으로의 확장이 필요합니다",
          "실무 경험을 통한 심화 학습이 도움이 될 것입니다"
        ];
      } else if (score >= 3.0) {
        return [
          "AI 기술의 실무 적용 경험을 늘려나가시기 바랍니다",
          "최신 AI 트렌드에 대한 지속적인 관심이 필요합니다",
          "데이터 분석 및 해석 능력 향상이 도움이 될 것입니다"
        ];
      } else {
        return [
          "AI 기본 개념에 대한 체계적인 학습이 필요합니다",
          "실무 적용을 위한 기초 역량 강화가 우선되어야 합니다",
          "단계적인 학습 계획 수립이 중요합니다"
        ];
      }
    };

    const getBasicRecommendations = (score: number) => {
      if (score >= 4.0) {
        return [
          "AI 전문가 과정이나 고급 교육 프로그램 참여를 추천합니다",
          "실제 프로젝트를 통한 실무 경험 축적을 권장합니다",
          "AI 관련 커뮤니티나 학회 활동 참여를 고려해보세요",
          "후배나 동료들에게 지식을 공유하는 멘토링 활동을 추천합니다"
        ];
      } else if (score >= 3.0) {
        return [
          "AI 관련 온라인 강의나 교육 과정 수강을 추천합니다",
          "실무에서 AI 도구를 활용한 작은 프로젝트부터 시작해보세요",
          "AI 관련 도서나 논문을 통한 이론적 지식 보완이 필요합니다",
          "AI 커뮤니티 참여를 통한 네트워킹을 권장합니다"
        ];
      } else {
        return [
          "AI 기초 개념부터 차근차근 학습하시기 바랍니다",
          "입문자를 위한 AI 교육 과정 참여를 강력히 추천합니다",
          "AI 관련 기초 도서나 온라인 자료를 활용한 자기주도 학습이 필요합니다",
          "AI 기초 실습을 통한 체험적 학습을 권장합니다"
        ];
      }
    };

    const getBasicSummary = (score: number) => {
      if (score >= 4.0) {
        return `${student.studentName}님은 AI 역량 진단에서 우수한 성과를 보여주셨습니다. 전반적으로 AI 기술에 대한 깊은 이해와 실무 적용 능력을 갖추고 계시며, 지속적인 학습을 통해 AI 전문가로 성장할 수 있는 잠재력을 보유하고 있습니다. 

특히 강점 영역에서는 뛰어난 역량을 보이고 있으며, 이를 바탕으로 더욱 전문적인 AI 프로젝트에 도전하시기를 권장합니다. 현재의 우수한 역량을 유지하면서도 새로운 AI 기술 트렌드에 대한 지속적인 관심과 학습을 통해 AI 분야의 리더로 성장할 수 있을 것입니다.

앞으로도 꾸준한 실무 경험 축적과 전문성 강화를 통해 AI 역량을 더욱 발전시켜 나가시기 바랍니다.`;
      } else if (score >= 3.0) {
        return `${student.studentName}님은 AI 기본 개념을 잘 이해하고 있으며, 실무 적용에 대한 관심도 높습니다. 체계적인 학습과 실무 경험을 통해 AI 역량을 더욱 발전시킬 수 있는 좋은 기반을 갖추고 계십니다. 

현재 수준에서 한 단계 더 발전하기 위해서는 실무 프로젝트 참여와 지속적인 학습이 필요합니다. 특히 약점으로 지적된 영역에 대한 집중적인 학습을 통해 전반적인 AI 역량을 균형 있게 발전시킬 수 있을 것입니다.

지속적인 노력을 통해 AI 활용 전문가로 성장할 수 있는 충분한 잠재력을 보유하고 계시므로, 체계적인 학습 계획을 수립하여 꾸준히 역량을 강화해 나가시기 바랍니다.`;
      } else {
        return `${student.studentName}님은 AI 기술에 대한 관심과 학습 의지를 보여주고 계십니다. 현재는 기초 단계이지만, 체계적인 학습 계획을 수립하고 단계별로 역량을 쌓아나간다면 충분히 AI 역량을 개발할 수 있을 것입니다. 

AI 분야는 지속적인 학습과 실습이 중요한 영역입니다. 기초 개념부터 차근차근 학습하시고, 실무 경험을 통해 이론과 실제를 연결하는 능력을 기르시기 바랍니다. 

추천드린 학습 방향을 따라 꾸준히 노력하신다면, 향후 AI 기술을 효과적으로 활용할 수 있는 역량을 갖출 수 있을 것입니다. 기초부터 차근차근 학습하시기를 권장합니다.`;
      }
    };

    return {
      strengths: getBasicStrengths(avgScore),
      weaknesses: getBasicWeaknesses(avgScore),
      recommendations: getBasicRecommendations(avgScore),
      summary: getBasicSummary(avgScore)
    };
  };

  const handleDownloadSelectedPDFs = async () => {
    try {
      const selectedStudentData: StudentResponse[] = [];
      
      selectedStudents.forEach(studentKey => {
        const [workspaceName, studentName] = studentKey.split('-');
        const student = studentData.find(s => s.studentName === studentName && s.workspaceName === workspaceName);
        if (student) {
          selectedStudentData.push(student);
        }
      });
      
      if (selectedStudentData.length === 0) {
        alert('선택된 학생이 없습니다.');
        return;
      }
      
      console.log('📦 PDF 생성 시작:', selectedStudentData.length, '명');
      
      // 순차적으로 각 학생의 PDF 생성
      for (const student of selectedStudentData) {
        await handleDownloadIndividualPDF(student);
      }
      
      // 선택 해제
      setSelectedStudents(new Set());
      console.log('✅ 모든 PDF 생성 완료');
    } catch (error) {
      console.error('❌ PDF 생성 실패:', error);
      alert('PDF 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return '#48bb78';
    if (score >= 3.0) return '#667eea';
    if (score >= 2.0) return '#ed8936';
    return '#e53e3e';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 4.0) return '우수';
    if (score >= 3.0) return '양호';
    if (score >= 2.0) return '보통';
    return '개선필요';
  };

  // 이제 사용하지 않는 개별 로딩 함수들 (useEffect에서 URL 기반으로 통합 처리)

  // 카테고리 점수 변환 헬퍼 함수
  const convertCategoryScores = (data: any) => {
    if (data.analysis?.category_scores) {
      // 새로운 Lambda AI 분석 구조
      const categoryMap: { [key: string]: string } = {
        'ai_fundamentals': 'AI/데이터 기본 이해',
        'technical_application': '문제 해결/적용 역량',
        'data_interpretation': '데이터 이해 및 해석 능력',
        'business_application': 'AI 관련 협업/소통 능력',
        'future_readiness': 'AI/기술 트렌드 민감도',
        'ethics_and_society': 'AI 윤리 및 사회적 영향'
      };
      
      return Object.entries(data.analysis.category_scores).map(([key, value]: [string, any]) => ({
        category: categoryMap[key] || key,
        score: Math.round(value.score * 6),
        maxScore: 30,
        percentage: Math.round((value.score / 5) * 100)
      }));
    } else if (data.aiAnalysis?.categoryScores) {
      // 기존 AI 분석 구조
      return data.aiAnalysis.categoryScores;
    } else {
      // 기본값
      const overallScore = data.analysis?.overall_score || data.aiAnalysis?.overallScore || 0;
      return [
        { category: 'AI/데이터 기본 이해', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
        { category: '문제 해결/적용 역량', score: Math.round(overallScore * 7), maxScore: 35, percentage: Math.round((overallScore * 7 / 35) * 100) },
        { category: '데이터 이해 및 해석 능력', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
        { category: 'AI 관련 협업/소통 능력', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
        { category: 'AI/기술 트렌드 민감도', score: Math.round(overallScore * 8), maxScore: 40, percentage: Math.round((overallScore * 8 / 40) * 100) },
      ];
    }
  };

  // 워크스페이스 선택 핸들러
  const handleWorkspaceSelect = async (workspaceName: string) => {
    navigate(`/reports/${encodeURIComponent(workspaceName)}`);
  };

  // 설문 선택 핸들러
  const handleSurveySelect = async (surveyName: string) => {
    navigate(`/reports/${encodeURIComponent(workspaceId!)}/${encodeURIComponent(surveyName)}`);
  };

  // 데이터 새로고침 함수 (URL 기반으로 전체 데이터 재로드)
  const handleRefresh = async () => {
    console.log('🔄 데이터 새로고침 시작 - 현재 URL 기반으로 재로드');
    // useEffect를 다시 트리거하여 URL 기반으로 데이터 로드
    window.location.reload();
  };

  const handleSendEmail = async () => {
    if (!emailDialogInfo) return;
    setEmailSending(true);
    setEmailSendResult(null);
    try {
      // PDF 경로 생성 (.json을 .pdf로 변경)
      const pdfPath = emailDialogInfo.pdfPath.replace('.json', '.pdf');
      
      const payload = {
        bucketName: API_CONFIG.S3.BUCKET_NAME,
        fileName: pdfPath,
        recipients: [emailDialogInfo.email],
        subject: 'AI 역량 진단 리포트',
        messageTitle: 'AI 역량 진단 결과 안내',
        messageText: `${emailDialogInfo.name}님의 AI 역량 진단 리포트를 첨부하여 보내드립니다.`,
        senderName: "Nation's LAB",
        additionalInfo: `${emailDialogInfo.name}님의 AI 역량 진단 결과입니다.`
      };
      
      // 🔍 디버깅: 보내는 payload 확인
      console.log('=== 이메일 송부 payload ===');
      console.log('원본 emailDialogInfo.pdfPath:', emailDialogInfo.pdfPath);
      console.log('변경된 pdfPath:', pdfPath);
      console.log('API_CONFIG.S3.BUCKET_NAME:', API_CONFIG.S3.BUCKET_NAME);
      console.log('payload:', JSON.stringify(payload, null, 2));
      
      const res = await fetch(API_CONFIG.LAMBDA.EMAIL_SERVICE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('Lambda 응답:', data);
      
      if (data.success) {
        setEmailSendResult('이메일 전송 성공!');
      } else {
        setEmailSendResult('이메일 전송 실패: ' + (data.error || data.message));
      }
    } catch (err) {
      console.error('이메일 전송 오류:', err);
      setEmailSendResult('이메일 전송 중 오류 발생: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>응답 데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // 워크스페이스 선택 화면
  if (currentStep === 'workspace-selection') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
            📊 AI 역량 진단 리포트
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              워크스페이스를 선택하여 학생들의 진단 결과를 확인하세요
            </Typography>
            <Tooltip title="백엔드 API를 통해 최신 데이터를 가져옵니다" arrow>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                새로고침
              </Button>
            </Tooltip>
          </Box>
        </Paper>

        {workspaces.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              아직 리포트가 있는 워크스페이스가 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI 분석이 완료된 설문이 있는 워크스페이스만 표시됩니다.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {workspaces.map((workspaceName) => (
              <Card 
                key={workspaceName}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  }
                }}
                onClick={() => handleWorkspaceSelect(workspaceName)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <School sx={{ color: '#667eea', mr: 2, fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {workspaceName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        클릭하여 설문 목록 보기
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    );
  }

  // 설문 선택 화면 (워크스페이스는 선택되었지만 설문이 선택되지 않은 경우)
  if (currentStep === 'survey-selection') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Button 
            variant="text" 
            sx={{ color: 'white', mb: 1 }}
            onClick={() => navigate('/reports')}
          >
            ← 워크스페이스 목록으로
          </Button>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
            {workspaceId}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            설문을 선택하여 AI 분석 결과를 확인하세요
          </Typography>
        </Paper>

        {workspaceSurveys.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              이 워크스페이스에는 AI 분석이 완료된 설문이 없습니다
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
            {workspaceSurveys.map((survey) => (
              <Card 
                key={survey.survey_name}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  }
                }}
                onClick={() => handleSurveySelect(survey.survey_name)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    {survey.survey_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    AI 분석 완료: {survey.ai_results_count}명
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 응답: {survey.total_students}명
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    );
  }

  // 학생 목록 화면 (워크스페이스와 설문이 모두 선택된 경우)
  const selectedCount = selectedStudents.size;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button 
              variant="text" 
              sx={{ color: 'white', mb: 1 }}
              onClick={() => navigate('/reports')}
            >
              ← 워크스페이스 목록으로
            </Button>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              {workspaceId}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {selectedCount}명 선택됨
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="백엔드 API를 통해 최신 데이터를 가져옵니다" arrow>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                새로고침
              </Button>
            </Tooltip>
          
          {selectedCount > 0 && (
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleDownloadSelectedPDFs}
              sx={{
                backgroundColor: '#e53e3e',
                '&:hover': { backgroundColor: '#c53030' },
                fontWeight: 600,
                px: 3,
                py: 1.5,
              }}
            >
              선택된 {selectedCount}명 PDF 다운로드
            </Button>
          )}
          </Box>
        </Box>
      </Paper>

      {/* 전체 선택 체크박스 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={studentData.length > 0 && studentData.every(s => 
                selectedStudents.has(`${workspaceId}-${s.studentName}`)
              )}
              indeterminate={
                studentData.some(s => selectedStudents.has(`${workspaceId}-${s.studentName}`)) &&
                !studentData.every(s => selectedStudents.has(`${workspaceId}-${s.studentName}`))
              }
              onChange={() => handleSelectAll(workspaceId!)}
              icon={<CheckBoxOutlineBlank />}
              checkedIcon={<CheckBox />}
            />
          }
          label={
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              전체 선택 ({studentData.length}명)
            </Typography>
          }
        />
      </Paper>

      {/* 학생 목록 */}
      {studentData.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Group sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            이 워크스페이스에는 아직 제출된 응답이 없습니다
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {studentData.map((student) => {
            const studentKey = `${workspaceId}-${student.studentName}`;
            const isSelected = selectedStudents.has(studentKey);
            
            return (
              <Paper 
                key={studentKey}
                sx={{ 
                  p: 3,
                  border: isSelected ? '2px solid #667eea' : '1px solid #e0e0e0',
                  backgroundColor: isSelected ? 'rgba(102, 126, 234, 0.05)' : 'white',
                  transition: 'all 0.3s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleStudentSelect(studentKey)}
                    icon={<CheckBoxOutlineBlank />}
                    checkedIcon={<CheckBox />}
                  />
                  
                  <Avatar sx={{ 
                    bgcolor: getScoreColor(student.overallScore),
                    width: 56,
                    height: 56,
                    fontSize: '1.5rem'
                  }}>
                    {student.studentName.charAt(0)}
                  </Avatar>
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {student.studentName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {student.studentInfo.organization} | {student.studentInfo.major}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      제출일: {new Date(student.submittedAt).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'center', mr: 2 }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      color: getScoreColor(student.overallScore),
                      mb: 1
                    }}>
                      {student.overallScore.toFixed(1)}
                    </Typography>
                    <Chip
                      label={getScoreLevel(student.overallScore)}
                      size="small"
                      sx={{
                        backgroundColor: getScoreColor(student.overallScore),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  
                  <Stack direction="row" spacing={1}>
                    {student.s3Key && student.s3Key.includes('/AI/') ? (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility sx={{ fontSize: 18 }} />}
                          onClick={() => handleStudentDetail(student)}
                          sx={{ 
                            borderColor: '#667eea',
                            color: '#667eea',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#5a67d8',
                              backgroundColor: 'rgba(102, 126, 234, 0.08)',
                            },
                            transition: 'all 0.2s ease',
                            px: 2.5,
                            py: 0.75,
                          }}
                        >
                          상세보기
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AutoAwesome sx={{ fontSize: 18 }} />}
                          endIcon={<PictureAsPdf sx={{ fontSize: 16 }} />}
                          onClick={() => handleDownloadIndividualPDF(student)}
                          sx={{ 
                            borderColor: '#667eea',
                            color: '#667eea',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#5a67d8',
                              backgroundColor: 'rgba(102, 126, 234, 0.08)',
                            },
                            transition: 'all 0.2s ease',
                            px: 2.5,
                            py: 0.75,
                          }}
                        >
                          AI 리포트
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Email sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            setEmailDialogInfo({
                              name: student.studentName,
                              email: student.studentInfo.email,
                              pdfPath: student.s3Key || '',
                            });
                            setEmailDialogOpen(true);
                          }}
                          sx={{
                            borderColor: '#667eea',
                            color: '#667eea',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#5a67d8',
                              backgroundColor: 'rgba(102, 126, 234, 0.08)',
                            },
                            transition: 'all 0.2s ease',
                            px: 2.5,
                            py: 0.75,
                          }}
                        >
                          이메일 송부
                        </Button>
                      </>
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 1,
                        color: '#94a3b8',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        px: 2,
                      }}>
                        <CircularProgress size={16} sx={{ color: '#94a3b8' }} />
                        <Typography variant="body2">
                          AI 분석 중입니다... (30-40초 소요)
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* 학생 상세 정보 다이얼로그 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              bgcolor: selectedStudentDetail ? getScoreColor(selectedStudentDetail.overallScore) : '#ccc'
            }}>
              {selectedStudentDetail?.studentName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedStudentDetail?.studentName}</Typography>
              <Typography variant="body2" color="text.secondary">
                AI 역량 진단 결과
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedStudentDetail && (
            <Box>
              {/* 종합 점수 */}
              <Paper sx={{ p: 3, mb: 3, textAlign: 'center', backgroundColor: '#f8faff' }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  color: getScoreColor(selectedStudentDetail.overallScore),
                  mb: 1
                }}>
                  {selectedStudentDetail.overallScore.toFixed(1)} / 5.0
                </Typography>
                <Chip
                  label={getScoreLevel(selectedStudentDetail.overallScore)}
                  sx={{
                    backgroundColor: getScoreColor(selectedStudentDetail.overallScore),
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 2,
                    py: 1
                  }}
                />
              </Paper>
              
              {/* 카테고리별 점수 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                카테고리별 점수
              </Typography>
              <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
                {selectedStudentDetail.categoryScores.map((category, index) => (
                  <Box key={index} sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {category.category}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {category.score} / {category.maxScore} ({category.percentage}%)
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              
              {/* 새로운 AI 분석 결과 표시 */}
              {selectedStudentDetail.analysis && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 3 }}>
                    🤖 AI 역량 분석 (상세)
                  </Typography>
                  
                  {/* 역량 레벨 표시 */}
                  <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f0f4ff' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#667eea' }}>
                      {selectedStudentDetail.analysis.competency_level}
                    </Typography>
                  </Paper>
                  
                  {/* 강점 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#22543d' }}>
                      💪 강점 영역
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.analysis.strengths.map((strength, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#f0fff4', 
                          borderLeft: '4px solid #48bb78',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">• {strength}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 개선 영역 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#742a2a' }}>
                      📈 개선 영역
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.analysis.improvement_areas.map((area, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#fff5f5', 
                          borderLeft: '4px solid #e53e3e',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">• {area}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 즉각적인 실행 사항 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#92400e' }}>
                      🎯 즉각적인 실행 사항
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.analysis.recommendations.immediate_actions.map((action, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#fef3c7', 
                          borderLeft: '4px solid #f59e0b',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">{index + 1}. {action}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 학습 리소스 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#3730a3' }}>
                      📚 추천 학습 리소스
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.analysis.recommendations.learning_resources.map((resource, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#ede9fe', 
                          borderLeft: '4px solid #7c3aed',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">{index + 1}. {resource}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 스킬 개발 경로 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#065f46' }}>
                      🚀 스킬 개발 경로
                    </Typography>
                    <Box sx={{ 
                      p: 3, 
                      backgroundColor: '#ecfdf5', 
                      borderRadius: 2,
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                        {selectedStudentDetail.analysis.recommendations.skill_development_path}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* 종합 요약 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#1e40af' }}>
                      📋 종합 요약
                    </Typography>
                    <Box sx={{ 
                      p: 3, 
                      backgroundColor: '#eff6ff', 
                      borderRadius: 2,
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                        {selectedStudentDetail.analysis.comprehensive_summary}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* 상세 리포트 */}
                  {selectedStudentDetail.analysis.detailed_report && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#7c2d12' }}>
                        🔍 상세 분석
                      </Typography>
                      <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>현재 위치</Typography>
                          <Typography variant="body2">{selectedStudentDetail.analysis.detailed_report.current_position}</Typography>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>성장 잠재력</Typography>
                          <Typography variant="body2">{selectedStudentDetail.analysis.detailed_report.growth_potential}</Typography>
                        </Box>
                        {selectedStudentDetail.analysis.detailed_report.key_insights && selectedStudentDetail.analysis.detailed_report.key_insights.length > 0 && (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>핵심 인사이트</Typography>
                            {selectedStudentDetail.analysis.detailed_report.key_insights.map((insight, index) => (
                              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>• {insight}</Typography>
                            ))}
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  )}
                </>
              )}
              
              {/* 기존 AI 분석 결과 (호환성 유지) */}
              {!selectedStudentDetail.analysis && selectedStudentDetail.aiAnalysis && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 3 }}>
                    🤖 AI 역량 분석
                  </Typography>
                  
                  {/* 강점 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#22543d' }}>
                      💪 강점 영역
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.aiAnalysis.strengths.map((strength, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#f0fff4', 
                          borderLeft: '4px solid #48bb78',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">• {strength}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 개선 영역 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#742a2a' }}>
                      📈 개선 영역
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.aiAnalysis.weaknesses.map((weakness, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#fff5f5', 
                          borderLeft: '4px solid #e53e3e',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">• {weakness}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 추천사항 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#92400e' }}>
                      💡 맞춤형 추천
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {selectedStudentDetail.aiAnalysis.recommendations.map((recommendation, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          backgroundColor: '#fffbeb', 
                          borderLeft: '4px solid #f59e0b',
                          borderRadius: 1
                        }}>
                          <Typography variant="body2">{index + 1}. {recommendation}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* 종합 분석 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#3730a3' }}>
                      🧠 종합 분석
                    </Typography>
                    <Box sx={{ 
                      p: 3, 
                      backgroundColor: '#f0f4ff', 
                      borderRadius: 2,
                      border: '1px solid rgba(102, 126, 234, 0.3)'
                    }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                        {selectedStudentDetail.aiAnalysis.summary}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
              
              {/* 학생 정보 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                👤 학생 정보
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">이메일</Typography>
                  <Typography variant="body1">{selectedStudentDetail.studentInfo.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">나이</Typography>
                  <Typography variant="body1">{selectedStudentDetail.studentInfo.age}세</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">소속</Typography>
                  <Typography variant="body1">{selectedStudentDetail.studentInfo.organization}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">학과</Typography>
                  <Typography variant="body1">{selectedStudentDetail.studentInfo.major}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">학력</Typography>
                  <Typography variant="body1">{selectedStudentDetail.studentInfo.education}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">제출일</Typography>
                  <Typography variant="body1">
                    {new Date(selectedStudentDetail.submittedAt).toLocaleString('ko-KR')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            닫기
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={() => {
              if (selectedStudentDetail) {
                handleDownloadIndividualPDF(selectedStudentDetail);
                setDetailDialogOpen(false);
              }
            }}
            sx={{
              backgroundColor: '#e53e3e',
              '&:hover': { backgroundColor: '#c53030' }
            }}
            disabled={!selectedStudentDetail?.s3Key?.includes('/AI/')}
          >
            {selectedStudentDetail?.s3Key?.includes('/AI/') 
              ? 'AI 분석 리포트 다운로드' 
              : 'AI 분석 진행 중...'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI 분석 모달 */}
      <AIAnalysisModal
        open={aiAnalysisModalOpen}
        onClose={() => {
          setAiAnalysisModalOpen(false);
          setSelectedStudentForAI(null);
        }}
        studentData={selectedStudentForAI}
      />

      {/* 이메일 송부 다이얼로그 */}
      <Dialog open={emailDialogOpen} onClose={() => { setEmailDialogOpen(false); setEmailSendResult(null); }}>
        <DialogTitle>이메일로 결과 송부</DialogTitle>
        <DialogContent>
          {emailDialogInfo && (
            <Box sx={{ minWidth: 320 }}>
              <Typography variant="body1" sx={{ mb: 1 }}><strong>이름:</strong> {emailDialogInfo.name}</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}><strong>이메일:</strong> {emailDialogInfo.email}</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}><strong>PDF 경로:</strong> {emailDialogInfo.pdfPath}</Typography>
              {emailSendResult && (
                <Alert severity={emailSendResult.includes('성공') ? 'success' : 'error'} sx={{ mt: 2 }}>{emailSendResult}</Alert>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                실제 이메일 전송 기능이 활성화되어 있습니다.<br />
                (이 정보가 람다 함수로 전달됩니다)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEmailDialogOpen(false); setEmailSendResult(null); }} color="primary">닫기</Button>
          <Button
            onClick={handleSendEmail}
            color="secondary"
            variant="contained"
            disabled={emailSending || !emailDialogInfo}
          >
            {emailSending ? '전송 중...' : '이메일 송부'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reports; 