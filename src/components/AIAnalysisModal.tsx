import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Close,
  AutoAwesome,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Psychology,
  PictureAsPdf,
} from '@mui/icons-material';
import { AIAnalysisService } from '../services/aiAnalysisService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface StudentData {
  studentName: string;
  workspaceName: string;
  surveyFolderName?: string;
  studentInfo: {
    name: string;
    organization: string;
    age: number;
    email: string;
    education: string;
    major: string;
  };
  answers: { [questionText: string]: number };
  overallScore: number;
  categoryScores: Array<{
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  aiAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    summary: string;
  };
}

interface StudentResponse {
  studentName: string;
  workspaceName: string;
  surveyFolderName: string;
  studentInfo: {
    name: string;
    organization: string;
    age: number;
    email: string;
    education: string;
    major: string;
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
  aiAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    summary: string;
  };
}

interface AIAnalysisResult {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
}

interface AIAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  studentData: StudentData | StudentResponse | null;
}

const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ open, onClose, studentData }) => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  // 모달이 열릴 때 S3에 저장된 AI 분석 결과가 있으면 바로 표시
  React.useEffect(() => {
    if (open && studentData?.aiAnalysis) {
      console.log('✅ S3에 저장된 AI 분석 결과 사용 (모달):', studentData.studentName);
      setAnalysisResult(studentData.aiAnalysis);
      setError('');
    } else if (open) {
      // 모달이 열릴 때마다 상태 초기화
      setAnalysisResult(null);
      setError('');
      setLoading(false);
    }
  }, [open, studentData]);

  const handleAnalyze = async () => {
    if (!studentData) return;

    setLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      console.log('🤖 Lambda AI 분석 시작 (S3에 저장된 결과 없음):', studentData.studentName);
      console.log('📤 전송 데이터:', {
        studentInfo: studentData.studentInfo,
        answers: studentData.answers,
        categoryScores: studentData.categoryScores,
        overallScore: studentData.overallScore
      });

      const result = await AIAnalysisService.analyzeCompetency({
        studentInfo: studentData.studentInfo,
        answers: studentData.answers,
        categoryScores: studentData.categoryScores,
        overallScore: studentData.overallScore,
        workspaceName: studentData.workspaceName,
        surveyFolderName: studentData.surveyFolderName
      });

      console.log('📥 Lambda 응답:', result);
      setAnalysisResult(result);
    } catch (err) {
      console.error('❌ AI 분석 실패:', err);
      setError(`AI 분석 중 오류가 발생했습니다: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!studentData || !analysisResult) return;

    try {
      // PDF 생성을 위한 임시 HTML 요소 생성
      const element = document.createElement('div');
      element.style.width = '210mm';
      element.style.padding = '20mm';
      element.style.backgroundColor = 'white';
      element.style.fontFamily = 'Arial, sans-serif';
      
      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #667eea; margin-bottom: 10px;">🤖 AI 역량 진단 리포트</h1>
          <p style="color: #666; font-size: 14px;">생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>
        
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f8faff; border-radius: 8px;">
          <h2 style="color: #1e293b; margin-bottom: 15px;">👤 학생 정보</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <p><strong>이름:</strong> ${studentData.studentInfo.name}</p>
            <p><strong>이메일:</strong> ${studentData.studentInfo.email}</p>
            <p><strong>소속:</strong> ${studentData.studentInfo.organization}</p>
            <p><strong>학과:</strong> ${studentData.studentInfo.major}</p>
            <p><strong>학력:</strong> ${studentData.studentInfo.education}</p>
            <p><strong>나이:</strong> ${studentData.studentInfo.age}세</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px; text-align: center; padding: 20px; background-color: #f0f4ff; border-radius: 8px;">
          <h2 style="color: #667eea; margin-bottom: 10px;">📊 종합 점수</h2>
          <div style="font-size: 48px; font-weight: bold; color: ${getScoreColor(studentData.overallScore)}; margin-bottom: 10px;">
            ${studentData.overallScore.toFixed(1)} / 5.0
          </div>
          <div style="background-color: ${getScoreColor(studentData.overallScore)}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600;">
            ${getScoreLevel(studentData.overallScore)}
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">📈 카테고리별 점수</h2>
          ${studentData.categoryScores.map(category => `
            <div style="margin-bottom: 15px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>${category.category}</strong>
                <span style="background-color: ${getScoreColor(category.percentage / 20)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                  ${category.percentage}%
                </span>
              </div>
              <div style="background-color: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background-color: ${getScoreColor(category.percentage / 20)}; height: 100%; width: ${category.percentage}%; border-radius: 4px;"></div>
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                ${category.score} / ${category.maxScore}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #22543d; margin-bottom: 15px;">💪 강점 영역</h2>
          ${analysisResult.strengths.map(strength => `
            <div style="margin-bottom: 8px; padding: 10px; background-color: #f0fff4; border-left: 4px solid #48bb78; border-radius: 4px;">
              • ${strength}
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #742a2a; margin-bottom: 15px;">📈 개선 영역</h2>
          ${analysisResult.weaknesses.map(weakness => `
            <div style="margin-bottom: 8px; padding: 10px; background-color: #fff5f5; border-left: 4px solid #e53e3e; border-radius: 4px;">
              • ${weakness}
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #92400e; margin-bottom: 15px;">💡 맞춤형 학습 추천</h2>
          ${analysisResult.recommendations.map((recommendation, index) => `
            <div style="margin-bottom: 8px; padding: 10px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
              ${index + 1}. ${recommendation}
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f0f4ff; border-radius: 8px;">
          <h2 style="color: #3730a3; margin-bottom: 15px;">🧠 AI 종합 분석</h2>
          <p style="line-height: 1.6; color: #1f2937;">
            ${analysisResult.summary}
          </p>
        </div>
      `;
      
      // 임시로 DOM에 추가
      document.body.appendChild(element);
      
      // HTML을 캔버스로 변환
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
      });
      
      // DOM에서 제거
      document.body.removeChild(element);
      
      // PDF 생성
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // PDF 다운로드
      pdf.save(`AI역량진단_${studentData.studentInfo.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF 생성 중 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4.0) return '#48bb78';
    if (score >= 3.0) return '#667eea';
    if (score >= 2.0) return '#ed8936';
    return '#e53e3e';
  };

  const getScoreLevel = (score: number): string => {
    if (score >= 4.0) return '우수';
    if (score >= 3.0) return '양호';
    if (score >= 2.0) return '보통';
    return '개선필요';
  };

  const handleClose = () => {
    setAnalysisResult(null);
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🤖 AI 역량 분석
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {studentData && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, backgroundColor: '#f8faff', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                👤 {studentData.studentInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {studentData.studentInfo.organization} | {studentData.studentInfo.major}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                종합 점수: {studentData.overallScore.toFixed(1)} / 5.0
              </Typography>
            </Paper>
          </Box>
        )}

        {!analysisResult && !loading && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AutoAwesome sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              새로운 AI 분석을 시작하세요
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Lambda 함수를 호출하여 실시간 AI 역량 분석을 수행합니다.<br />
              (S3에 저장된 분석 결과가 없는 경우에만 표시됩니다)
            </Typography>
            <Button
              variant="contained"
              startIcon={<AutoAwesome />}
              onClick={handleAnalyze}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontWeight: 600,
                px: 4,
                py: 1.5,
              }}
            >
              🚀 새로운 AI 분석 시작
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              🤖 AI 분석 중...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lambda 함수에서 Bedrock AI 분석을 수행하고 있습니다.
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {analysisResult && (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              {studentData?.aiAnalysis 
                ? '✅ S3에 저장된 AI 분석 결과를 불러왔습니다!' 
                : '✅ AI 분석이 완료되었습니다! Lambda 함수에서 실시간 분석 결과를 받았습니다.'
              }
            </Alert>

            {/* 강점 영역 */}
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
              border: '2px solid #48bb78'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: '#22543d'
              }}>
                <TrendingUp sx={{ color: '#48bb78' }} />
                💪 강점 영역
              </Typography>
              
              <Stack spacing={1}>
                {analysisResult.strengths.map((strength, index) => (
                  <Box key={index} sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(255,255,255,0.7)', 
                    borderRadius: 2,
                    border: '1px solid rgba(72, 187, 120, 0.3)'
                  }}>
                    <Typography variant="body2">• {strength}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* 개선 영역 */}
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
              border: '2px solid #e53e3e'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: '#742a2a'
              }}>
                <TrendingDown sx={{ color: '#e53e3e' }} />
                📈 개선 영역
              </Typography>
              
              <Stack spacing={1}>
                {analysisResult.weaknesses.map((weakness, index) => (
                  <Box key={index} sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(255,255,255,0.7)', 
                    borderRadius: 2,
                    border: '1px solid rgba(229, 62, 62, 0.3)'
                  }}>
                    <Typography variant="body2">• {weakness}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* 추천사항 */}
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '2px solid #f59e0b'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: '#92400e'
              }}>
                <Lightbulb sx={{ color: '#f59e0b' }} />
                💡 맞춤형 학습 추천
              </Typography>
              
              <Stack spacing={1}>
                {analysisResult.recommendations.map((recommendation, index) => (
                  <Box key={index} sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(255,255,255,0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <Typography variant="body2">{index + 1}. {recommendation}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* 종합 분석 */}
            <Paper sx={{ 
              p: 3,
              background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)',
              border: '2px solid #667eea'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: '#3730a3'
              }}>
                <Psychology sx={{ color: '#667eea' }} />
                🧠 AI 종합 분석
              </Typography>
              
              <Box sx={{ 
                p: 3, 
                backgroundColor: 'rgba(255,255,255,0.8)', 
                borderRadius: 2,
                border: '1px solid rgba(102, 126, 234, 0.3)'
              }}>
                <Typography variant="body1" sx={{ 
                  lineHeight: 1.6,
                  color: '#1f2937'
                }}>
                  {analysisResult.summary}
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined">
          닫기
        </Button>
        
        {!analysisResult && !loading && (
          <Button
            variant="contained"
            startIcon={<AutoAwesome />}
            onClick={handleAnalyze}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontWeight: 600,
            }}
          >
            새로운 AI 분석 시작
          </Button>
        )}

        {analysisResult && studentData?.aiAnalysis && (
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={handleAnalyze}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#764ba2',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
              }
            }}
          >
            새로운 AI 분석 수행
          </Button>
        )}

        {analysisResult && (
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handleDownloadPDF}
            sx={{
              backgroundColor: '#e53e3e',
              '&:hover': { backgroundColor: '#c53030' },
              fontWeight: 600,
            }}
          >
            PDF 다운로드
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AIAnalysisModal; 