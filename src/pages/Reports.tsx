import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import S3Service, { SurveyResponse } from '../services/s3Service';
import { generateReportPDF, generateMultipleReportsPDF } from '../utils/pdfGenerator';
import { AIAnalysisService } from '../services/aiAnalysisService';
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

const Reports: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceStudents, setWorkspaceStudents] = useState<WorkspaceStudents>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentResponse | null>(null);
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [selectedStudentForAI, setSelectedStudentForAI] = useState<StudentResponse | null>(null);

  // S3에서 응답 데이터 로드
  useEffect(() => {
    const loadResponses = async () => {
      try {
        setLoading(true);
        console.log('📋 S3에서 응답 데이터 로드 시작');
        
        // S3에서 모든 리포트 파일 조회 (AI 분석 여부 상관없이)
        const allResponses = await S3Service.listAllReports();
        console.log('📋 로드된 전체 리포트 수:', allResponses.length);
        
        // 중복 제거 - 학생 이름 기준으로 AI 분석 완료된 것을 우선
        const responseMap = new Map<string, SurveyResponse>();
        
        // 먼저 AI 폴더가 아닌 일반 응답들을 추가
        allResponses.forEach((response) => {
          if (!response.s3Key?.includes('/AI/')) {
            const key = `${response.workspaceName}-${response.studentInfo.name}`;
            responseMap.set(key, response);
          }
        });
        
        // 그 다음 AI 폴더의 응답들로 덮어쓰기 (AI 분석 완료된 것 우선)
        allResponses.forEach((response) => {
          if (response.s3Key?.includes('/AI/')) {
            const key = `${response.workspaceName}-${response.studentInfo.name}`;
            responseMap.set(key, response);
          }
        });
        
        // Map을 배열로 변환
        const uniqueResponses = Array.from(responseMap.values());
        console.log('📋 중복 제거 후 리포트 수:', uniqueResponses.length);
        
        // 워크스페이스별로 그룹화
        const grouped: WorkspaceStudents = {};
        
        uniqueResponses.forEach((response: SurveyResponse) => {
          const workspaceName = response.workspaceName;
          if (!grouped[workspaceName]) {
            grouped[workspaceName] = [];
          }
          
          // AI 분석 결과가 있으면 사용, 없으면 계산
          let overallScore: number;
          let categoryScores: Array<{category: string; score: number; maxScore: number; percentage: number}>;
          let aiAnalysis: any = undefined;
          
          // 새로운 AI 분석 구조 확인 (analysis 필드)
          if (response.analysis) {
            // 새로운 Lambda AI 분석 결과 사용
            console.log('✅ 새로운 Lambda AI 분석 결과 발견:', response.studentInfo.name);
            overallScore = response.analysis.overall_score || 0;
            
            // 카테고리 점수 변환
            categoryScores = [];
            const categoryMap: { [key: string]: string } = {
              'ai_fundamentals': 'AI/데이터 기본 이해',
              'technical_application': '문제 해결/적용 역량',
              'data_interpretation': '데이터 이해 및 해석 능력',
              'business_application': 'AI 관련 협업/소통 능력',
              'future_readiness': 'AI/기술 트렌드 민감도',
              'ethics_and_society': 'AI 윤리 및 사회적 영향'
            };
            
            for (const [key, value] of Object.entries(response.analysis.category_scores)) {
              categoryScores.push({
                category: categoryMap[key] || key,
                score: Math.round(value.score * 6), // 5점 만점을 30점 만점으로 환산
                maxScore: 30,
                percentage: Math.round((value.score / 5) * 100)
              });
            }
            
            // 기존 형식으로 변환
            aiAnalysis = {
              strengths: response.analysis.strengths,
              weaknesses: response.analysis.improvement_areas,
              recommendations: [
                ...response.analysis.recommendations.immediate_actions,
                ...response.analysis.recommendations.learning_resources
              ],
              summary: response.analysis.comprehensive_summary
            };
          } else if (response.aiAnalysis) {
            // AI 분석 결과가 있으면 사용, 없으면 계산
            console.log('✅ S3에서 Lambda 생성 AI 분석 결과 발견:', response.studentInfo.name);
            overallScore = response.aiAnalysis.overallScore || 0;
            categoryScores = response.aiAnalysis.categoryScores || [];
            
            // AI 분석 결과 검증 및 보완
            const validatedAIAnalysis = {
              strengths: response.aiAnalysis.strengths && response.aiAnalysis.strengths.length > 0 
                ? response.aiAnalysis.strengths 
                : ['AI 기술에 대한 기본적인 이해를 갖추고 있습니다.'],
              weaknesses: response.aiAnalysis.weaknesses && response.aiAnalysis.weaknesses.length > 0 
                ? response.aiAnalysis.weaknesses 
                : ['지속적인 학습과 발전이 필요합니다.'],
              recommendations: response.aiAnalysis.recommendations && response.aiAnalysis.recommendations.length > 0 
                ? response.aiAnalysis.recommendations 
                : ['체계적인 AI 학습 계획을 수립하시기 바랍니다.'],
              summary: response.aiAnalysis.summary && response.aiAnalysis.summary.length > 50 
                ? response.aiAnalysis.summary 
                : `${response.studentInfo.name}님의 AI 역량 진단 결과, 전반적으로 ${overallScore >= 4.0 ? '우수한' : overallScore >= 3.0 ? '양호한' : '기초적인'} 수준의 AI 역량을 보유하고 계십니다. 지속적인 학습과 실무 경험을 통해 더욱 발전시켜 나가시기 바랍니다.`
            };
            
            aiAnalysis = validatedAIAnalysis;
            console.log('🔍 Lambda 생성 AI 분석 결과 검증 완료:', {
              summaryLength: validatedAIAnalysis.summary.length,
              strengthsCount: validatedAIAnalysis.strengths.length,
              weaknessesCount: validatedAIAnalysis.weaknesses.length,
              recommendationsCount: validatedAIAnalysis.recommendations.length,
              overallScore,
              categoryScoresCount: categoryScores.length
            });
          } else {
            // AI 분석 결과가 없으면 기본 계산
            console.log('⚠️ AI 분석 결과 없음, 기본 계산 사용:', response.studentInfo.name);
            const scores = Object.values(response.answers) as number[];
            overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            
            categoryScores = [
              { category: 'AI/데이터 기본 이해', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
              { category: '문제 해결/적용 역량', score: Math.round(overallScore * 7), maxScore: 35, percentage: Math.round((overallScore * 7 / 35) * 100) },
              { category: '데이터 이해 및 해석 능력', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
              { category: 'AI 관련 협업/소통 능력', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
              { category: 'AI/기술 트렌드 민감도', score: Math.round(overallScore * 8), maxScore: 40, percentage: Math.round((overallScore * 8 / 40) * 100) },
            ];
          }
          
          grouped[workspaceName].push({
            ...response,
            studentName: response.studentInfo.name,
            s3Key: response.s3Key,  // S3 키 정보 추가
            overallScore,
            categoryScores,
            aiAnalysis,  // Lambda에서 생성된 AI 분석 결과 또는 기본 분석
          });
        });
        
        setWorkspaceStudents(grouped);
        
        // URL에 워크스페이스 ID가 있으면 해당 워크스페이스 선택
        if (workspaceId) {
          const workspaceName = Object.keys(grouped).find(name => 
            name.toLowerCase().replace(/\s+/g, '-') === workspaceId
          );
          if (workspaceName) {
            setSelectedWorkspace(workspaceName);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('응답 데이터 로드 실패:', err);
        setError('응답 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [workspaceId]);

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
    const students = workspaceStudents[workspaceName] || [];
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
        const student = workspaceStudents[workspaceName]?.find(s => s.studentName === studentName);
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

  // 데이터 새로고침 함수
  const handleRefresh = async () => {
    setLoading(true);
    try {
      console.log('🔄 데이터 새로고침 시작');
      
      // S3에서 모든 리포트 파일 조회 (AI 분석 여부 상관없이)
      const allResponses = await S3Service.listAllReports();
      console.log('📋 새로고침 - 로드된 전체 리포트 수:', allResponses.length);
      
      // 중복 제거 - 학생 이름 기준으로 AI 분석 완료된 것을 우선
      const responseMap = new Map<string, SurveyResponse>();
      
      // 먼저 AI 폴더가 아닌 일반 응답들을 추가
      allResponses.forEach((response) => {
        if (!response.s3Key?.includes('/AI/')) {
          const key = `${response.workspaceName}-${response.studentInfo.name}`;
          responseMap.set(key, response);
        }
      });
      
      // 그 다음 AI 폴더의 응답들로 덮어쓰기 (AI 분석 완료된 것 우선)
      allResponses.forEach((response) => {
        if (response.s3Key?.includes('/AI/')) {
          const key = `${response.workspaceName}-${response.studentInfo.name}`;
          responseMap.set(key, response);
        }
      });
      
      // Map을 배열로 변환
      const uniqueResponses = Array.from(responseMap.values());
      console.log('📋 새로고침 - 중복 제거 후 리포트 수:', uniqueResponses.length);
      
      // 워크스페이스별로 그룹화
      const grouped: WorkspaceStudents = {};
      
      uniqueResponses.forEach((response: SurveyResponse) => {
        const workspaceName = response.workspaceName;
        if (!grouped[workspaceName]) {
          grouped[workspaceName] = [];
        }
        
        // AI 분석 결과가 있으면 사용, 없으면 계산
        let overallScore: number;
        let categoryScores: Array<{category: string; score: number; maxScore: number; percentage: number}>;
        let aiAnalysis: any = undefined;
        
        // 새로운 AI 분석 구조 확인 (analysis 필드)
        if (response.analysis) {
          // 새로운 Lambda AI 분석 결과 사용
          console.log('✅ 새로운 Lambda AI 분석 결과 발견:', response.studentInfo.name);
          overallScore = response.analysis.overall_score || 0;
          
          // 카테고리 점수 변환
          categoryScores = [];
          const categoryMap: { [key: string]: string } = {
            'ai_fundamentals': 'AI/데이터 기본 이해',
            'technical_application': '문제 해결/적용 역량',
            'data_interpretation': '데이터 이해 및 해석 능력',
            'business_application': 'AI 관련 협업/소통 능력',
            'future_readiness': 'AI/기술 트렌드 민감도',
            'ethics_and_society': 'AI 윤리 및 사회적 영향'
          };
          
          for (const [key, value] of Object.entries(response.analysis.category_scores)) {
            categoryScores.push({
              category: categoryMap[key] || key,
              score: Math.round(value.score * 6), // 5점 만점을 30점 만점으로 환산
              maxScore: 30,
              percentage: Math.round((value.score / 5) * 100)
            });
          }
          
          // 기존 형식으로 변환
          aiAnalysis = {
            strengths: response.analysis.strengths,
            weaknesses: response.analysis.improvement_areas,
            recommendations: [
              ...response.analysis.recommendations.immediate_actions,
              ...response.analysis.recommendations.learning_resources
            ],
            summary: response.analysis.comprehensive_summary
          };
        } else if (response.aiAnalysis) {
          // AI 분석 결과가 있으면 사용, 없으면 계산
          console.log('✅ S3에서 Lambda 생성 AI 분석 결과 발견:', response.studentInfo.name);
          overallScore = response.aiAnalysis.overallScore || 0;
          categoryScores = response.aiAnalysis.categoryScores || [];
          
          // AI 분석 결과 검증 및 보완
          const validatedAIAnalysis = {
            strengths: response.aiAnalysis.strengths && response.aiAnalysis.strengths.length > 0 
              ? response.aiAnalysis.strengths 
              : ['AI 기술에 대한 기본적인 이해를 갖추고 있습니다.'],
            weaknesses: response.aiAnalysis.weaknesses && response.aiAnalysis.weaknesses.length > 0 
              ? response.aiAnalysis.weaknesses 
              : ['지속적인 학습과 발전이 필요합니다.'],
            recommendations: response.aiAnalysis.recommendations && response.aiAnalysis.recommendations.length > 0 
              ? response.aiAnalysis.recommendations 
              : ['체계적인 AI 학습 계획을 수립하시기 바랍니다.'],
            summary: response.aiAnalysis.summary && response.aiAnalysis.summary.length > 50 
              ? response.aiAnalysis.summary 
              : `${response.studentInfo.name}님의 AI 역량 진단 결과, 전반적으로 ${overallScore >= 4.0 ? '우수한' : overallScore >= 3.0 ? '양호한' : '기초적인'} 수준의 AI 역량을 보유하고 계십니다. 지속적인 학습과 실무 경험을 통해 더욱 발전시켜 나가시기 바랍니다.`
          };
          
          aiAnalysis = validatedAIAnalysis;
        } else {
          // AI 분석 결과가 없으면 기본 계산
          const scores = Object.values(response.answers) as number[];
          overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          
          categoryScores = [
            { category: 'AI/데이터 기본 이해', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
            { category: '문제 해결/적용 역량', score: Math.round(overallScore * 7), maxScore: 35, percentage: Math.round((overallScore * 7 / 35) * 100) },
            { category: '데이터 이해 및 해석 능력', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
            { category: 'AI 관련 협업/소통 능력', score: Math.round(overallScore * 6), maxScore: 30, percentage: Math.round((overallScore * 6 / 30) * 100) },
            { category: 'AI/기술 트렌드 민감도', score: Math.round(overallScore * 8), maxScore: 40, percentage: Math.round((overallScore * 8 / 40) * 100) },
          ];
        }
        
        grouped[workspaceName].push({
          ...response,
          studentName: response.studentInfo.name,
          s3Key: response.s3Key,  // S3 키 정보 추가
          overallScore,
          categoryScores,
          aiAnalysis,
        });
      });
      
      setWorkspaceStudents(grouped);
      console.log('✅ 데이터 새로고침 완료');
    } catch (err) {
      console.error('❌ 데이터 새로고침 실패:', err);
      setError('데이터 새로고침에 실패했습니다.');
    } finally {
      setLoading(false);
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

  const workspaceNames = Object.keys(workspaceStudents);

  // 워크스페이스 선택 화면
  if (!selectedWorkspace) {
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
          </Box>
        </Paper>

        {workspaceNames.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              아직 제출된 설문 응답이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              학생들이 설문을 완료하면 여기에 결과가 표시됩니다.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {workspaceNames.map((workspaceName) => {
              const students = workspaceStudents[workspaceName];
              const avgScore = students.reduce((sum, s) => sum + s.overallScore, 0) / students.length;
              
              return (
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
                  onClick={() => setSelectedWorkspace(workspaceName)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <School sx={{ color: '#667eea', mr: 2, fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {workspaceName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {students.length}명의 학생
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          평균 점수
                        </Typography>
                        <Typography variant="h5" sx={{ 
                          fontWeight: 700,
                          color: getScoreColor(avgScore)
                        }}>
                          {avgScore.toFixed(1)}
                        </Typography>
                      </Box>
                      <Chip
                        label={getScoreLevel(avgScore)}
                        sx={{
                          backgroundColor: getScoreColor(avgScore),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    );
  }

  // 선택된 워크스페이스의 학생 목록
  const students = workspaceStudents[selectedWorkspace] || [];
  const selectedCount = Array.from(selectedStudents).filter(key => 
    key.startsWith(`${selectedWorkspace}-`)
  ).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button 
              variant="text" 
              sx={{ color: 'white', mb: 1 }}
              onClick={() => setSelectedWorkspace('')}
            >
              ← 워크스페이스 목록으로
            </Button>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              {selectedWorkspace}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {students.length}명의 학생 | {selectedCount}명 선택됨
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
              checked={students.length > 0 && students.every(s => 
                selectedStudents.has(`${selectedWorkspace}-${s.studentName}`)
              )}
              indeterminate={
                students.some(s => selectedStudents.has(`${selectedWorkspace}-${s.studentName}`)) &&
                !students.every(s => selectedStudents.has(`${selectedWorkspace}-${s.studentName}`))
              }
              onChange={() => handleSelectAll(selectedWorkspace)}
              icon={<CheckBoxOutlineBlank />}
              checkedIcon={<CheckBox />}
            />
          }
          label={
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              전체 선택 ({students.length}명)
            </Typography>
          }
        />
      </Paper>

      {/* 학생 목록 */}
      {students.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Group sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            이 워크스페이스에는 아직 제출된 응답이 없습니다
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {students.map((student) => {
            const studentKey = `${selectedWorkspace}-${student.studentName}`;
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
    </Container>
  );
};

export default Reports; 