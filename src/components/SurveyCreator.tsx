import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { read, utils, writeFile, write } from 'xlsx';
import { surveyAPI } from '../services/apiService';
import S3Service from '../services/s3Service';
import {
  CloudUpload,
  Delete,
  Add,
  Download,
  FileUpload,
  PlayArrow,
  Stop,
} from '@mui/icons-material';

interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
}

interface SurveyCreatorProps {
  open: boolean;
  onClose: () => void;
  onSave: (surveyData: any) => Promise<{ id: string; status: string }>;
  workspaceName?: string;
}

const SurveyCreator: React.FC<SurveyCreatorProps> = ({ open, onClose, onSave, workspaceName }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    scoreScale: 5,
    targetCount: 0,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [surveyStatus, setSurveyStatus] = useState<'draft' | 'active'>('draft');
  const [survey, setSurvey] = useState<{id: string; status: string} | null>(null);

  const aiCompetencyQuestions = [
    { category: 'AI/데이터 기본 이해', text: '머신러닝과 딥러닝의 차이를 실무적으로 설명할 수 있다.' },
    { category: 'AI/데이터 기본 이해', text: 'AI가 내 업무에 적용될 수 있는 방식과 제약조건을 구체적으로 이해하고 있다.' },
    { category: 'AI/데이터 기본 이해', text: '시가 총액부터 위치 정보, 텍스트, 이미지, 음성 등의 데이터 종류를 설명할 수 있다.' },
    { category: 'AI/데이터 기본 이해', text: 'AI/데이터 분석 프로젝트의 전체 기획 절차를 설명할 수 있다.' },
    { category: 'AI/데이터 기본 이해', text: '데이터 기반 의사결정의 구조를 설명할 수 있다.' },
    { category: 'AI/데이터 기본 이해', text: 'AI 프로젝트 성공 요인과 한계를 구분하여 설명할 수 있다.' },
    { category: '문제 해결/적용 역량', text: '현재 수행 중인 업무나 반복 업무를 AI로 개선할 수 있다고 판단한 경험이 있다.' },
    { category: '문제 해결/적용 역량', text: '비즈니스 문제를 데이터 기반으로 구조화한 경험이 있다.' },
    { category: '문제 해결/적용 역량', text: 'AI/데이터 분석으로 개선 효과를 수치화한 경험이 있다.' },
    { category: '문제 해결/적용 역량', text: 'AI/데이터 분석 솔루션의 성능지표(정확도, 재현율 등)를 테스트한 경험이 있다.' },
    { category: '문제 해결/적용 역량', text: 'AI 솔루션의 도입이 실패했던 사례를 분석하고 피드백한 경험이 있다.' },
    { category: '문제 해결/적용 역량', text: 'AI 프로젝트에 참여하여 구체적인 기획, 구현 또는 운영 경험이 있다.' },
    { category: '문제 해결/적용 역량', text: '데이터 기반 문제 정의 및 해결을 위한 팀 프로젝트 경험이 있다.' },
    { category: '데이터 이해 및 해석 능력', text: '주요 지표(KPI)를 스스로 정의하고 데이터를 기반으로 분석한 경험이 있다.' },
    { category: '데이터 이해 및 해석 능력', text: 'SQL 또는 BI 툴을 사용해 데이터를 추출하거나 직접 작성한 경험이 있다.' },
    { category: '데이터 이해 및 해석 능력', text: 'EDA(탐색적 데이터 분석) 절차를 실무에 적용한 경험이 있다.' },
    { category: '데이터 이해 및 해석 능력', text: '데이터 시각화 도구를 사용해 인사이트를 도출한 경험이 있다.' },
    { category: '데이터 이해 및 해석 능력', text: '복수 데이터의 관계를 설명하고 상관관계를 해석한 경험이 있다.' },
    { category: '데이터 이해 및 해석 능력', text: '데이터 기반 분석 결과를 통해 의사결정에 영향을 준 경험이 있다.' },
    { category: 'AI 관련 협업/소통 능력', text: '개발자나 데이터 사이언티스트와 프로젝트 협업을 한 경험이 있다.' },
    { category: 'AI 관련 협업/소통 능력', text: 'AI/데이터 분석 과제를 다른 조직 구성원에게 설명한 경험이 있다.' },
    { category: 'AI 관련 협업/소통 능력', text: '데이터 분석 결과를 시각화하여 발표한 경험이 있다.' },
    { category: 'AI 관련 협업/소통 능력', text: '업무 중 다양한 이해관계자와 데이터 기반 논의를 한 경험이 있다.' },
    { category: 'AI 관련 협업/소통 능력', text: 'AI 기술 도입 관련 제안서를 작성하거나 발표한 경험이 있다.' },
    { category: 'AI 관련 협업/소통 능력', text: 'AI 기술과 관련된 외부 이해관계자(고객사 등)와 소통한 경험이 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: 'ChatGPT, Claude, Copilot 등 생성형 AI를 실무에 사용한 경험이 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: '최신 AI 기술 또는 API를 업무에 테스트하거나 적용해 본 경험이 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: 'MLOps, AutoML, 데이터 플랫폼 등 기술 키워드에 익숙하다.' },
    { category: 'AI/기술 트렌드 민감도', text: '산업계 최신 AI 도입 트렌드를 뉴스, 세미나 등으로 꾸준히 파악하고 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: 'AI 관련 세미나, 컨퍼런스, 커뮤니티 등에 참여한 경험이 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: '기술 트렌드와 실무 이슈를 연결해 조직에 제안한 경험이 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: 'AI 기반 프로젝트를 사전검토(POC) 또는 적용한 경험이 있다.' },
    { category: 'AI/기술 트렌드 민감도', text: 'AI/데이터 기반 실험에 주도적으로 참여한 경험이 있다.' },
    { category: 'AI 윤리 및 거버넌스 인식', text: 'AI 시스템의 편향, 공정성, 프라이버시 문제에 대해 인식하고 있다.' },
    { category: 'AI 윤리 및 거버넌스 인식', text: 'AI 결과 해석의 어려움 및 신뢰성 문제를 고려한 적이 있다.' },
    { category: 'AI 윤리 및 거버넌스 인식', text: 'AI/데이터 보안 및 개인정보보호 이슈를 알고 있으며 대처방안을 고민해봤다.' },
    { category: 'AI 윤리 및 거버넌스 인식', text: 'AI 윤리 관련 외부 사례(법, 규제, 사고 등)를 검토한 경험이 있다.' },
    { category: 'AI 윤리 및 거버넌스 인식', text: '조직 내부에서 AI 윤리 지침 또는 가이드를 마련하거나 적용한 경험이 있다.' },
    { category: 'AI 윤리 및 거버넌스 인식', text: 'AI 프로젝트에 있어 사회적 영향이나 윤리 문제를 고려한 경험이 있다.' },
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      try {
        setUploadError('');
        console.log('=== 엑셀 파일 업로드 디버깅 ===');
        console.log('파일 정보:', {
          name: file.name,
          size: file.size,
          type: file.type
        });

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
            
            console.log('엑셀 파일 파싱 결과:', {
              sheetName,
              totalRows: jsonData.length,
              headerRow: jsonData[0],
              firstDataRow: jsonData[1]
            });
            
            // 기존 문항 유지
            const existingQuestions = [...questions];
            console.log('기존 문항 수:', existingQuestions.length);
            
            const newQuestions: Question[] = [];
            
            // 엑셀에서 새로운 문항 파싱
            for (let i = 1; i < jsonData.length; i++) { 
              const row = jsonData[i] as any[];
              if (row[0] && row[1] && row[2]) { 
                newQuestions.push({
                  id: `q${existingQuestions.length + i}`,
                  text: row[1], 
                  category: row[2], 
                  order: existingQuestions.length + i,
                });
              }
            }

            console.log('새로 파싱된 문항 수:', newQuestions.length);
            
            // 전체 문항 수 체크
            const totalQuestions = existingQuestions.length + newQuestions.length;
            console.log('전체 문항 수:', totalQuestions);
            
            if (totalQuestions > 100) {
              setUploadError('전체 문항 수가 100개를 초과할 수 없습니다.');
              return;
            }

            // 기존 문항과 새로운 문항 병합
            const mergedQuestions = [...existingQuestions, ...newQuestions];
            console.log('병합된 문항 수:', mergedQuestions.length);
            
            // 순서 재정렬
            const reorderedQuestions = mergedQuestions.map((q, index) => ({
              ...q,
              order: index + 1
            }));

            console.log('최종 문항 수:', reorderedQuestions.length);
            setQuestions(reorderedQuestions);
            setUploadError('');
            setUploadedFile(file);
          } catch (error) {
            console.error('엑셀 파싱 오류:', error);
            setUploadError('엑셀 파일을 읽는 중 오류가 발생했습니다.');
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('파일 처리 오류:', error);
        setUploadError('파일 처리 중 오류가 발생했습니다.');
      }
    }
  }, [questions]); // questions를 의존성 배열에 추가

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const addQuestion = () => {
    if (questions.length >= 100) {
      setUploadError('문항은 최대 100개까지만 추가할 수 있습니다.');
      return;
    }
    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      text: '',
      category: 'AI 기초',
      order: questions.length + 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const uploadFileToS3ViaBackend = async (surveyId: string, file: File): Promise<boolean> => {
    try {
      setIsUploading(true);
      setUploadError('');

      console.log('=== S3 직접 업로드 시작 ===');
      console.log('Survey ID:', surveyId);

      // 현재 questions 배열로 새로운 엑셀 파일 생성
      const excelData = [
        ['순번', '문항 내용', '카테고리', '비고'],
        ...questions.map((q, index) => [
          index + 1,
          q.text,
          q.category,
          ''
        ])
      ];

      // 엑셀 파일 생성
      const ws = utils.aoa_to_sheet(excelData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'AI역량진단문항');
      
      // 엑셀 파일을 Blob으로 변환
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const updatedFile = new File([blob], file.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      console.log('File info:', {
        name: updatedFile.name,
        type: updatedFile.type,
        size: updatedFile.size
      });

      // AWS 설정 확인
      const configCheck = S3Service.validateConfig();
      if (!configCheck.valid) {
        const missingVars = configCheck.missing.join(', ');
        throw new Error(`AWS 환경 변수가 설정되지 않았습니다: ${missingVars}`);
      }

      // S3에 직접 업로드 (surveys 폴더에 저장)
      console.log('🚀 S3Service를 사용하여 파일 업로드 중...');
      const uploadResult = await S3Service.uploadFile(
        updatedFile,
        `surveys/${surveyId}/${updatedFile.name}`,
        workspaceName || 'default-workspace'
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'S3 업로드 실패');
      }

      console.log('✅ S3 업로드 성공!', {
        s3Key: uploadResult.s3Key,
        url: uploadResult.url
      });

      // 백엔드에 업로드 완료 알림 (선택사항)
      try {
        const fileKey = `surveys/${surveyId}/${updatedFile.name}`;
        await surveyAPI.confirmUploadComplete(surveyId, fileKey);
        console.log('백엔드에 업로드 완료 알림 전송됨');
      } catch (confirmError) {
        console.warn('백엔드 업로드 완료 알림 실패 (무시하고 계속):', confirmError);
      }

      return true;

    } catch (error) {
      console.error('파일 업로드 중 오류 발생:', error);
      
      const proceedWithoutFile = window.confirm(
        `파일 업로드에 실패했습니다.\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n파일 없이 설문을 생성하시겠습니까?\n(나중에 수동으로 문항을 추가할 수 있습니다)`
      );
      
      if (proceedWithoutFile) {
        console.log('사용자가 파일 없이 진행을 선택함');
        return true;
      }
      
      setUploadError(`파일 업로드 처리 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['순번', '문항 내용', '카테고리', '비고'],
      ['1', '머신러닝과 딥러닝의 차이를 실무적으로 설명할 수 있다.', 'AI/데이터 기본 이해', ''],
      ['2', 'AI가 내 업무에 적용될 수 있는 방식과 제약조건을 구체적으로 이해하고 있다.', 'AI/데이터 기본 이해', ''],
      ['3', '시가 총액부터 위치 정보, 텍스트, 이미지, 음성 등의 데이터 종류를 설명할 수 있다.', 'AI/데이터 기본 이해', ''],
      ['4', 'AI/데이터 분석 프로젝트의 전체 기획 절차를 설명할 수 있다.', 'AI/데이터 기본 이해', ''],
      ['5', '데이터 기반 의사결정의 구조를 설명할 수 있다.', 'AI/데이터 기본 이해', ''],
      ['6', 'AI 프로젝트 성공 요인과 한계를 구분하여 설명할 수 있다.', 'AI/데이터 기본 이해', ''],
      ['7', '현재 수행 중인 업무나 반복 업무를 AI로 개선할 수 있다고 판단한 경험이 있다.', '문제 해결/적용 역량', ''],
      ['8', '비즈니스 문제를 데이터 기반으로 구조화한 경험이 있다.', '문제 해결/적용 역량', ''],
      ['9', 'AI/데이터 분석으로 개선 효과를 수치화한 경험이 있다.', '문제 해결/적용 역량', ''],
      ['10', 'AI/데이터 분석 솔루션의 성능지표(정확도, 재현율 등)를 테스트한 경험이 있다.', '문제 해결/적용 역량', ''],
      ['11', 'AI 솔루션의 도입이 실패했던 사례를 분석하고 피드백한 경험이 있다.', '문제 해결/적용 역량', ''],
      ['12', 'AI 프로젝트에 참여하여 구체적인 기획, 구현 또는 운영 경험이 있다.', '문제 해결/적용 역량', ''],
      ['13', '데이터 기반 문제 정의 및 해결을 위한 팀 프로젝트 경험이 있다.', '문제 해결/적용 역량', ''],
      ['14', '주요 지표(KPI)를 스스로 정의하고 데이터를 기반으로 분석한 경험이 있다.', '데이터 이해 및 해석 능력', ''],
      ['15', 'SQL 또는 BI 툴을 사용해 데이터를 추출하거나 직접 작성한 경험이 있다.', '데이터 이해 및 해석 능력', ''],
      ['16', 'EDA(탐색적 데이터 분석) 절차를 실무에 적용한 경험이 있다.', '데이터 이해 및 해석 능력', ''],
      ['17', '데이터 시각화 도구를 사용해 인사이트를 도출한 경험이 있다.', '데이터 이해 및 해석 능력', ''],
      ['18', '복수 데이터의 관계를 설명하고 상관관계를 해석한 경험이 있다.', '데이터 이해 및 해석 능력', ''],
      ['19', '데이터 기반 분석 결과를 통해 의사결정에 영향을 준 경험이 있다.', '데이터 이해 및 해석 능력', ''],
      ['20', '개발자나 데이터 사이언티스트와 프로젝트 협업을 한 경험이 있다.', 'AI 관련 협업/소통 능력', ''],
      ['21', 'AI/데이터 분석 과제를 다른 조직 구성원에게 설명한 경험이 있다.', 'AI 관련 협업/소통 능력', ''],
      ['22', '데이터 분석 결과를 시각화하여 발표한 경험이 있다.', 'AI 관련 협업/소통 능력', ''],
      ['23', '업무 중 다양한 이해관계자와 데이터 기반 논의를 한 경험이 있다.', 'AI 관련 협업/소통 능력', ''],
      ['24', 'AI 기술 도입 관련 제안서를 작성하거나 발표한 경험이 있다.', 'AI 관련 협업/소통 능력', ''],
      ['25', 'AI 기술과 관련된 외부 이해관계자(고객사 등)와 소통한 경험이 있다.', 'AI 관련 협업/소통 능력', ''],
      ['26', 'ChatGPT, Claude, Copilot 등 생성형 AI를 실무에 사용한 경험이 있다.', 'AI/기술 트렌드 민감도', ''],
      ['27', '최신 AI 기술 또는 API를 업무에 테스트하거나 적용해 본 경험이 있다.', 'AI/기술 트렌드 민감도', ''],
      ['28', 'MLOps, AutoML, 데이터 플랫폼 등 기술 키워드에 익숙하다.', 'AI/기술 트렌드 민감도', ''],
      ['29', '산업계 최신 AI 도입 트렌드를 뉴스, 세미나 등으로 꾸준히 파악하고 있다.', 'AI/기술 트렌드 민감도', ''],
      ['30', 'AI 관련 세미나, 컨퍼런스, 커뮤니티 등에 참여한 경험이 있다.', 'AI/기술 트렌드 민감도', ''],
      ['31', '기술 트렌드와 실무 이슈를 연결해 조직에 제안한 경험이 있다.', 'AI/기술 트렌드 민감도', ''],
      ['32', 'AI 기반 프로젝트를 사전검토(POC) 또는 적용한 경험이 있다.', 'AI/기술 트렌드 민감도', ''],
      ['33', 'AI/데이터 기반 실험에 주도적으로 참여한 경험이 있다.', 'AI/기술 트렌드 민감도', ''],
      ['34', 'AI 시스템의 편향, 공정성, 프라이버시 문제에 대해 인식하고 있다.', 'AI 윤리 및 거버넌스 인식', ''],
      ['35', 'AI 결과 해석의 어려움 및 신뢰성 문제를 고려한 적이 있다.', 'AI 윤리 및 거버넌스 인식', ''],
      ['36', 'AI/데이터 보안 및 개인정보보호 이슈를 알고 있으며 대처방안을 고민해봤다.', 'AI 윤리 및 거버넌스 인식', ''],
      ['37', 'AI 윤리 관련 외부 사례(법, 규제, 사고 등)를 검토한 경험이 있다.', 'AI 윤리 및 거버넌스 인식', ''],
      ['38', '조직 내부에서 AI 윤리 지침 또는 가이드를 마련하거나 적용한 경험이 있다.', 'AI 윤리 및 거버넌스 인식', ''],
      ['39', 'AI 프로젝트에 있어 사회적 영향이나 윤리 문제를 고려한 경험이 있다.', 'AI 윤리 및 거버넌스 인식', ''],
    ];
    const ws = utils.aoa_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'AI역량진단문항');
    writeFile(wb, 'AI역량진단_문항템플릿.xlsx');
  };

  const handleSave = async () => {
    if (!surveyData.title) {
      setUploadError('설문 제목은 반드시 필요합니다.');
      return;
    }
    if (!uploadedFile && questions.length === 0) {
        setUploadError('엑셀 파일을 업로드하거나 수동으로 문항을 추가해야 합니다.');
        return;
    }

    // 파일명 생성 - {설문제목}_{원본파일명}
    const uploadFileName = uploadedFile 
      ? `${surveyData.title}_${uploadedFile.name}`
      : `${surveyData.title}_survey.xlsx`;

    console.log('=== 설문 저장 디버깅 ===');
    console.log('현재 문항 수:', questions.length);
    console.log('문항 목록:', questions);

    // 현재 questions 배열을 그대로 사용 (엑셀 파일에서 로드한 문항 + 수동 추가 문항)
    const surveyPayloadForBackend = { 
        ...surveyData,
        status: 'active',
        uploadedFileName: uploadFileName,
        questions: questions.map((q, index) => ({
          ...q,
          order: index + 1 // 순서 재정렬
        })),
    };

    console.log('백엔드로 전송되는 페이로드:', surveyPayloadForBackend);
    console.log('전송되는 문항 수:', surveyPayloadForBackend.questions.length);

    try {
      console.log("백엔드에 설문 메타데이터 생성 요청:", surveyPayloadForBackend);
      const savedSurveyMeta = await onSave(surveyPayloadForBackend); 
      console.log("백엔드 설문 생성 완료:", savedSurveyMeta);

      if (!savedSurveyMeta || !savedSurveyMeta.id) {
        setUploadError("백엔드에서 설문 ID를 받지 못했습니다. 설문 생성이 실패했을 수 있습니다.");
        return;
      }
      
      setSurvey({ id: savedSurveyMeta.id, status: savedSurveyMeta.status || 'draft' });
      setSurveyStatus(savedSurveyMeta.status as 'draft' | 'active' || 'draft');

      let fileUploadAttempted = false;
      let fileUploadSucceeded = false;

      if (uploadedFile) {
        fileUploadAttempted = true;
        console.log(`생성된 설문 ID [${savedSurveyMeta.id}]에 대해 엑셀 파일 S3 업로드 시도...`);
        fileUploadSucceeded = await uploadFileToS3ViaBackend(savedSurveyMeta.id, uploadedFile);
        if (fileUploadSucceeded) {
          console.log("엑셀 파일 S3 업로드 및 백엔드 확인 완료.");
        } else {
          console.warn("엑셀 파일 S3 업로드 또는 백엔드 확인 실패. 설문 메타데이터는 생성되었으나 파일 처리에 문제가 있습니다.");
        }
      }
      
      if (!fileUploadAttempted || fileUploadSucceeded) {
        onClose(); 
        setSurveyData({ title: '', description: '', scoreScale: 5, targetCount: 0 });
        setQuestions([]);
        setUploadedFile(null);
        setUploadError('');
      }

    } catch (error) {
      console.error('설문 저장 또는 파일 업로드 중 전체적인 오류 발생:', error);
      setUploadError(`설문 처리 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };
  
  const handleStatusChange = async () => {
    if (!survey || !survey.id) {
      alert('설문이 아직 저장되지 않았거나 ID가 없습니다.');
      return;
    }
    try {
      setIsActivating(true);
      const newStatus = surveyStatus === 'active' ? 'draft' : 'active';
      await surveyAPI.updateStatus(survey.id, newStatus);
      setSurveyStatus(newStatus);
      setSurvey(prev => prev ? {...prev, status: newStatus} : null);
      alert(newStatus === 'active' ? '설문이 활성화되었습니다.' : '설문이 비활성화되었습니다.');
    } catch (error) {
      console.error('설문 상태 변경 실패:', error);
      alert('설문 상태 변경에 실패했습니다.');
    } finally {
      setIsActivating(false);
    }
  };

  const categories = [
    'AI/데이터 기본 이해',
    '문제 해결/적용 역량',
    '데이터 이해 및 해석 능력',
    'AI 관련 협업/소통 능력',
    'AI/기술 트렌드 민감도',
    'AI 윤리 및 거버넌스 인식'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">설문 생성</Typography>
          <Box>
            {survey && survey.id && (
              <Button
                variant="contained"
                color={surveyStatus === 'active' ? 'error' : 'success'}
                onClick={handleStatusChange}
                disabled={isActivating}
                startIcon={surveyStatus === 'active' ? <Stop /> : <PlayArrow />}
                sx={{ mr: 1 }}
              >
                {isActivating ? '변경 중...' : (surveyStatus === 'active' ? '비활성화' : '활성화')}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={onClose}
              color="inherit"
            >
              닫기
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="기본 정보" />
            <Tab label="문항 관리" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box>
            <TextField
              autoFocus
              margin="dense"
              label="설문 제목"
              fullWidth
              variant="outlined"
              value={surveyData.title}
              onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              margin="dense"
              label="설문 설명"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={surveyData.description}
              onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="대상 인원수 (명)"
              type="number"
              fullWidth
              variant="outlined"
              value={surveyData.targetCount}
              onChange={(e) => setSurveyData({ ...surveyData, targetCount: Number(e.target.value) })}
              sx={{ mb: 2 }}
              inputProps={{ min: 0 }}
              helperText="설문 대상 인원수를 입력하세요. (선택, 미입력 시 0명)"
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>점수 스케일</InputLabel>
              <Select
                value={surveyData.scoreScale}
                label="점수 스케일"
                onChange={(e) => setSurveyData({ ...surveyData, scoreScale: e.target.value as number })}
              >
                <MenuItem value={3}>1-3 (3점 척도)</MenuItem>
                <MenuItem value={5}>1-5 (5점 척도)</MenuItem>
                <MenuItem value={7}>1-7 (7점 척도)</MenuItem>
                <MenuItem value={10}>1-10 (10점 척도)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">문항 업로드</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    startIcon={<Download />}
                    onClick={downloadTemplate}
                    sx={{ textTransform: 'none' }}
                  >
                    템플릿 다운로드
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => {
                      const defaultQuestions = aiCompetencyQuestions.map((q, i) => ({
                        id: `q${i + 1}`,
                        text: q.text,
                        category: q.category,
                        order: i + 1,
                      }));
                      setQuestions(defaultQuestions);
                      if (!surveyData.title) { 
                        setSurveyData({
                          title: 'AI 기반 직무역량 자가진단 설문 (기본)',
                          description: 'AI/데이터 기본 이해부터 윤리 및 거버넌스까지 종합적인 AI 역량을 진단합니다.',
                          scoreScale: 5,
                          targetCount: 0,
                        });
                      }
                      setUploadedFile(null); 
                      setUploadError('');
                    }}
                    sx={{
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      textTransform: 'none',
                    }}
                  >
                    AI 역량진단 설문 바로 추가
                  </Button>
                </Box>
              </Box>
              
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  backgroundColor: isDragActive ? '#f5f5f5' : 'transparent',
                  opacity: isUploading ? 0.6 : 1,
                  '&:hover': { backgroundColor: isUploading ? 'transparent' : '#f9f9f9' },
                }}
              >
                <input {...getInputProps()} disabled={isUploading} />
                <CloudUpload sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {isUploading 
                    ? '파일 업로드 중...' 
                    : isDragActive 
                      ? '파일을 여기에 놓으세요' 
                      : '엑셀 파일을 드래그하거나 클릭하여 업로드'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  .xlsx, .xls 파일만 지원 (최대 100문항)
                </Typography>
                {uploadedFile && (
                  <Typography variant="body2" sx={{ mt: 1, color: '#48bb78', fontWeight: 600 }}>
                    ✓ {uploadedFile.name} 준비됨
                  </Typography>
                )}
              </Box>
            </Box>

            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                문항 목록 ({questions.length}/100)
              </Typography>
              <Button
                startIcon={<Add />}
                onClick={addQuestion}
                disabled={questions.length >= 100}
                sx={{ textTransform: 'none' }}
              >
                문항 추가
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>순번</TableCell>
                    <TableCell>문항 내용</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell width={100}>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questions.map((question, index) => (
                    <TableRow key={question.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={question.text}
                          onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                          placeholder="문항 내용을 입력하세요"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={question.category}
                            onChange={(e) => updateQuestion(question.id, 'category', e.target.value as string)}
                          >
                            {categories.map((cat) => (
                              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {questions.length === 0 && !uploadedFile && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <FileUpload sx={{ fontSize: 48, mb: 2 }} />
                <Typography>
                  엑셀 파일을 업로드하거나 수동으로 문항을 추가해주세요
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          취소
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={
            !!(!surveyData.title || 
            (questions.length === 0 && !uploadedFile) || 
            isUploading)
          }
          sx={{
            textTransform: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:disabled': {
              background: '#e0e0e0',
            },
          }}
        >
          {isUploading ? '처리 중...' : '설문 생성하기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SurveyCreator; 