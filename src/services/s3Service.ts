import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
// import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';

// AWS 설정
const AWS_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,  // 실제 AWS Access Key ID
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  // 실제 AWS Secret Access Key
  region: 'ap-northeast-2',
  bucketName: 'competency-surveys',  // 설문 폼과 응답 저장용 버킷
  // 프로덕션용 Cognito 설정
  cognitoIdentityPoolId: '',
};

// 개발용 S3 클라이언트 (직접 자격 증명 사용)
const s3Client = new S3Client([{
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.accessKeyId || '',
    secretAccessKey: AWS_CONFIG.secretAccessKey || '',
  },
}]);

/* 프로덕션용 S3 클라이언트 (Cognito 사용) 
const s3ClientProduction = new S3Client({
  region: AWS_CONFIG.region,
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: AWS_CONFIG.region }),
    identityPoolId: AWS_CONFIG.cognitoIdentityPoolId,
  }),
});
*/

export interface S3UploadResult {
  success: boolean;
  s3Key: string;
  url: string;
  error?: string;
}

export interface S3DownloadResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export interface SurveyResponse {
  surveyId: string;
  workspaceName: string;
  surveyFolderName: string;  // 설문별 폴더명 추가
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
  filename: string;
  s3Key?: string;  // S3 경로 추가
  // AI 분석 상태 추가
  aiAnalysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  // 새로운 Lambda AI 분석 결과 구조
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
  // 기존 AI 분석 결과 (호환성 유지)
  aiAnalysis?: {
    overallScore: number;
    categoryScores: Array<{
      category: string;
      score: number;
      maxScore: number;
      percentage: number;
    }>;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    summary: string;
    analyzedAt: string;
  };
}

class S3Service {
  /**
   * AWS 설정을 반환합니다
   */
  static getConfig() {
    return {
      bucketName: AWS_CONFIG.bucketName,
      region: AWS_CONFIG.region
    };
  }

  /**
   * 환경에 따라 적절한 업로드 방식을 선택합니다
   */
  static async uploadFile(
    file: File, 
    surveyId: string,
    workspaceName: string,
    onProgress?: (progress: number) => void
  ): Promise<S3UploadResult> {
    // 일단 모든 환경에서 직접 업로드 방식 사용
    console.log('🚀 S3 직접 업로드 방식 사용');
    return this.uploadDirectly(file, surveyId, workspaceName, onProgress);
  }

  /**
   * 백엔드를 통한 업로드 (프로덕션 권장)
   */
  private static async uploadViaBackend(
    file: File,
    surveyId: string,
    workspaceName: string
  ): Promise<S3UploadResult> {
    try {
      // 여기서 백엔드 API 호출
      // const response = await fetch('/api/upload', { ... });
      
      // 임시로 에러 반환 (백엔드 구현 필요)
      throw new Error('백엔드 업로드 방식은 아직 구현되지 않았습니다. 백엔드 팀에 문의하세요.');
      
    } catch (error) {
      return {
        success: false,
        s3Key: '',
        url: '',
        error: error instanceof Error ? error.message : '백엔드 업로드 실패',
      };
    }
  }

  /**
   * S3에 직접 업로드 (개발용)
   */
  private static async uploadDirectly(
    file: File, 
    surveyId: string,
    workspaceName: string,
    onProgress?: (progress: number) => void
  ): Promise<S3UploadResult> {
    try {
      console.log('🚀 S3 직접 업로드 시작');
      console.log('파일 정보:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      console.log('워크스페이스:', workspaceName);

      // forms/{workspaceName}/{originalFilename} 구조로 단순화
      const s3Key = `forms/${workspaceName}/${file.name}`;
      
      console.log('S3 키:', s3Key);

      // PutObject 명령 생성
      const command = new PutObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: s3Key,
        ContentType: file.type,
        Metadata: {
          'survey-id': surveyId,
          'workspace-name': workspaceName,
          'original-filename': file.name,
          'upload-type': 'survey-excel',
        },
      });

      // Presigned URL 생성 (15분 유효)
      const presignedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 900 // 15분
      });

      console.log('Presigned URL 생성 완료');

      // 파일 업로드
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 업로드 실패:', uploadResponse.status, errorText);
        throw new Error(`S3 업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('✅ S3 업로드 성공!');
      console.log('📁 업로드 경로:', `s3://${AWS_CONFIG.bucketName}/${s3Key}`);

      // 설문 URL 생성 (개발/프로덕션 환경에 따라 다르게)
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'http://competency-surveys-platform.s3-website.ap-northeast-2.amazonaws.com'
        : 'http://localhost:3000';

      const surveyUrl = `${baseUrl}/survey/${surveyId}?workspace=${encodeURIComponent(workspaceName)}&file=${encodeURIComponent(file.name)}`;

      return {
        success: true,
        s3Key,
        url: surveyUrl,  // S3 URL 대신 설문 URL 반환
      };

    } catch (error) {
      console.error('❌ S3 업로드 오류:', error);
      return {
        success: false,
        s3Key: '',
        url: '',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * S3에서 엑셀 파일을 다운로드하고 파싱합니다
   */
  static async downloadAndParseExcel(
    workspaceName: string,
    filename: string
  ): Promise<S3DownloadResult> {
    try {
      console.log('📥 S3에서 엑셀 파일 다운로드 시작:', { workspaceName, filename });
      
      const s3Key = `forms/${workspaceName}/${filename}`;
      // S3 직접 URL 사용
      const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${s3Key}`;
      
      console.log('📁 다운로드 URL:', fileUrl);
      
      // S3에서 파일 다운로드
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // 엑셀 파일 파싱
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // 문항 데이터 변환
      const questions: any[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row[0] && row[1] && row[2]) {
          questions.push({
            id: `q${i}`,
            text: row[1],
            category: row[2],
            order: i,
          });
        }
      }
      
      console.log('✅ 엑셀 파싱 완료:', questions.length, '개 문항');
      
      return {
        success: true,
        data: questions,
      };
      
    } catch (error) {
      console.error('❌ S3 엑셀 다운로드/파싱 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 설문 리포트를 S3에 저장합니다 (reports 폴더)
   */
  static async saveReport(responseData: SurveyResponse): Promise<S3UploadResult> {
    try {
      console.log('💾 S3에 설문 리포트 저장 시작:', responseData);
      
      // 파일명 생성: reports/{workspaceName}/{surveyFolderName}/{studentName}.json
      const studentName = responseData.studentInfo.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      const filename = `${studentName}.json`;
      const s3Key = `reports/${responseData.workspaceName}/${responseData.surveyFolderName}/${filename}`;
      
      console.log('📁 리포트 저장 경로:', s3Key);
      
      // JSON 데이터 생성
      const jsonData = JSON.stringify(responseData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // PutObject 명령 생성
      const command = new PutObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: s3Key,
        ContentType: 'application/json',
        Metadata: {
          'survey-id': responseData.surveyId,
          'workspace-name': responseData.workspaceName,
          'student-name': responseData.studentInfo.name,
          'student-email': responseData.studentInfo.email,
          'submitted-at': responseData.submittedAt,
          'content-type': 'survey-report',
        },
      });

      // Presigned URL 생성 (15분 유효)
      const presignedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 900 // 15분
      });

      console.log('Presigned URL 생성 완료');

      // 파일 업로드
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 리포트 저장 실패:', uploadResponse.status, errorText);
        throw new Error(`S3 리포트 저장 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('✅ S3 리포트 저장 성공!');
      console.log('📁 저장 경로:', `s3://${AWS_CONFIG.bucketName}/${s3Key}`);

      // S3 직접 URL 사용
      const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${s3Key}`;

      return {
        success: true,
        s3Key,
        url: fileUrl,
      };

    } catch (error) {
      console.error('❌ S3 리포트 저장 오류:', error);
      return {
        success: false,
        s3Key: '',
        url: '',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 설문 응답을 S3에 저장합니다 (기존 호환성을 위해 유지)
   * @deprecated saveReport 사용을 권장합니다
   */
  static async saveResponse(responseData: SurveyResponse): Promise<S3UploadResult> {
    console.warn('⚠️ saveResponse는 deprecated입니다. saveReport 사용을 권장합니다.');
    return this.saveReport(responseData);
  }

  /**
   * 백엔드를 통해 설문 응답과 AI 분석 결과를 S3에 저장합니다 (권장 방식)
   * 저장 경로: reports/{workspaceName}/{surveyFolderName}/{studentName}.json
   */
  static async saveResponseViaBackend(
    responseData: SurveyResponse,
    aiAnalysisResult?: {
      overallScore: number;
      categoryScores: Array<{
        category: string;
        score: number;
        maxScore: number;
        percentage: number;
      }>;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      summary: string;
    }
  ): Promise<S3UploadResult> {
    try {
      console.log('🔄 백엔드를 통한 S3 리포트 저장 시작:', responseData.studentInfo.name);
      
      // 백엔드로 전송할 데이터 준비
      const backendPayload = {
        survey_id: responseData.surveyId,
        workspace_name: responseData.workspaceName,
        survey_folder_name: responseData.surveyFolderName,
        student_info: responseData.studentInfo,
        answers: responseData.answers,
        submitted_at: responseData.submittedAt,
        ai_analysis: aiAnalysisResult ? {
          overall_score: aiAnalysisResult.overallScore,
          category_scores: aiAnalysisResult.categoryScores,
          strengths: aiAnalysisResult.strengths,
          weaknesses: aiAnalysisResult.weaknesses,
          recommendations: aiAnalysisResult.recommendations,
          summary: aiAnalysisResult.summary,
          analyzed_at: new Date().toISOString()
        } : null
      };

      console.log('📤 백엔드로 전송할 데이터:', backendPayload);

      // 백엔드 API 호출 - reports 폴더에 저장
      const response = await fetch('/api/v1/reports/save-to-s3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`백엔드 저장 실패: ${response.status} ${response.statusText} - ${errorData.detail || ''}`);
      }

      const result = await response.json();
      console.log('✅ 백엔드를 통한 S3 리포트 저장 성공:', result);

      return {
        success: true,
        s3Key: result.s3_key || `reports/${responseData.workspaceName}/${responseData.surveyFolderName}/${responseData.studentInfo.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`,
        url: result.s3_url || '',
      };

    } catch (error) {
      console.error('❌ 백엔드를 통한 S3 리포트 저장 실패:', error);
      
      // 백엔드 실패 시 프론트엔드 직접 저장으로 fallback
      console.log('🔄 프론트엔드 직접 저장으로 fallback...');
      
      if (aiAnalysisResult) {
        return this.saveReportWithAIAnalysis(responseData, aiAnalysisResult);
      } else {
        return this.saveReport(responseData);
      }
    }
  }

  /**
   * AI 분석 결과와 함께 설문 리포트를 S3에 저장합니다 (reports 폴더)
   */
  static async saveReportWithAIAnalysis(
    responseData: SurveyResponse,
    aiAnalysisResult: {
      overallScore: number;
      categoryScores: Array<{
        category: string;
        score: number;
        maxScore: number;
        percentage: number;
      }>;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      summary: string;
    }
  ): Promise<S3UploadResult> {
    try {
      console.log('🤖💾 AI 분석 결과와 함께 S3에 설문 리포트 저장 시작:', responseData.studentInfo.name);
      
      // AI 분석 결과를 응답 데이터에 추가
      const responseWithAI: SurveyResponse = {
        ...responseData,
        aiAnalysis: {
          ...aiAnalysisResult,
          analyzedAt: new Date().toISOString(),
        }
      };
      
      // 파일명 생성: reports/{workspaceName}/{surveyFolderName}/{studentName}.json
      const studentName = responseData.studentInfo.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      const filename = `${studentName}.json`;
      const s3Key = `reports/${responseData.workspaceName}/${responseData.surveyFolderName}/${filename}`;
      
      console.log('📁 AI 분석 포함 리포트 저장 경로:', s3Key);
      
      // JSON 데이터 생성
      const jsonData = JSON.stringify(responseWithAI, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // PutObject 명령 생성
      const command = new PutObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: s3Key,
        ContentType: 'application/json',
        Metadata: {
          'survey-id': responseData.surveyId,
          'workspace-name': responseData.workspaceName,
          'student-name': responseData.studentInfo.name,
          'student-email': responseData.studentInfo.email,
          'submitted-at': responseData.submittedAt,
          'content-type': 'survey-report-with-ai',
          'ai-analyzed-at': responseWithAI.aiAnalysis!.analyzedAt,
          'overall-score': aiAnalysisResult.overallScore.toString(),
        },
      });

      // Presigned URL 생성 (15분 유효)
      const presignedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 900 // 15분
      });

      console.log('Presigned URL 생성 완료');

      // 파일 업로드
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 AI 분석 포함 리포트 저장 실패:', uploadResponse.status, errorText);
        throw new Error(`S3 AI 분석 포함 리포트 저장 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('✅ S3 AI 분석 포함 리포트 저장 성공!');
      console.log('📁 저장 경로:', `s3://${AWS_CONFIG.bucketName}/${s3Key}`);

      // S3 직접 URL 사용
      const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${s3Key}`;

      return {
        success: true,
        s3Key,
        url: fileUrl,
      };

    } catch (error) {
      console.error('❌ S3 AI 분석 포함 리포트 저장 오류:', error);
      return {
        success: false,
        s3Key: '',
        url: '',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * AI 분석 결과와 함께 설문 응답을 S3에 저장합니다 (기존 호환성을 위해 유지)
   * @deprecated saveReportWithAIAnalysis 사용을 권장합니다
   */
  static async saveResponseWithAIAnalysis(
    responseData: SurveyResponse,
    aiAnalysisResult: {
      overallScore: number;
      categoryScores: Array<{
        category: string;
        score: number;
        maxScore: number;
        percentage: number;
      }>;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      summary: string;
    }
  ): Promise<S3UploadResult> {
    console.warn('⚠️ saveResponseWithAIAnalysis는 deprecated입니다. saveReportWithAIAnalysis 사용을 권장합니다.');
    return this.saveReportWithAIAnalysis(responseData, aiAnalysisResult);
  }

  /**
   * S3에서 모든 리포트 파일을 조회합니다 (reports 폴더)
   */
  static async listAllReports(): Promise<SurveyResponse[]> {
    try {
      console.log('📋 S3에서 모든 리포트 파일 조회 시작');
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: 'reports/',
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log('📋 S3 리포트 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const reports: SurveyResponse[] = [];
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const reportData = await fileResponse.json();
              // s3Key 정보 추가 (중요!)
              reportData.s3Key = object.Key;
              reports.push(reportData);
              console.log('✅ 리포트 파일 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ 리포트 파일 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ 리포트 파일 파싱 실패:', object.Key, error);
          }
        }
      }

      console.log('📋 총 로드된 리포트:', reports.length, '개');
      return reports;
      
    } catch (error) {
      console.error('❌ S3 리포트 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * S3에서 모든 응답 파일을 조회합니다 (기존 responses 폴더 + 새로운 reports 폴더)
   */
  static async listAllResponses(): Promise<SurveyResponse[]> {
    try {
      console.log('📋 S3에서 모든 응답 파일 조회 시작 (responses + reports 폴더)');
      
      // 기존 responses 폴더와 새로운 reports 폴더 둘 다 조회
      const [responsesData, reportsData] = await Promise.all([
        this.listResponsesFromFolder('responses/'),
        this.listResponsesFromFolder('reports/')
      ]);
      
      // 중복 제거 (같은 학생의 응답이 두 폴더에 모두 있을 수 있음)
      const allResponses = [...responsesData, ...reportsData];
      console.log('📊 전체 응답 데이터:', allResponses);

      // 유효한 응답만 필터링 (필수 필드가 있는 응답만)
      const validResponses = allResponses.filter(response => 
        response?.studentInfo?.name && 
        response?.workspaceName && 
        response?.submittedAt
      );
      console.log('✅ 유효한 응답 수:', validResponses.length);

      // 날짜순 정렬
      const sortedResponses = validResponses.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      return sortedResponses;
      
    } catch (error) {
      console.error('❌ S3 응답 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 폴더에서 응답 파일들을 조회하는 헬퍼 메서드
   */
  private static async listResponsesFromFolder(prefix: string): Promise<SurveyResponse[]> {
    try {
      console.log(`📂 ${prefix} 폴더 조회 시작`);
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: prefix,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log(`📄 ${prefix} 파일 목록:`, response.Contents?.length || 0);
      
      if (!response.Contents) {
        return [];
      }

      const responses: SurveyResponse[] = [];
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const responseData = await fileResponse.json();
              // s3Key 정보 추가
              responseData.s3Key = object.Key;
              responses.push(responseData);
              console.log('✅ 응답 파일 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ 응답 파일 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ 응답 파일 파싱 실패:', object.Key, error);
          }
        }
      }

      return responses;
      
    } catch (error) {
      console.warn('⚠️ 폴더 조회 실패:', prefix, error);
      return [];
    }
  }

  /**
   * 중복된 응답을 제거하는 헬퍼 메서드 (reports 폴더의 데이터를 우선)
   */
  private static removeDuplicateResponses(responses: SurveyResponse[]): SurveyResponse[] {
    const uniqueMap = new Map<string, SurveyResponse>();
    
    // 먼저 responses 폴더 데이터를 추가
    responses.forEach(response => {
      const key = `${response.workspaceName}-${response.surveyFolderName}-${response.studentInfo.name}`;
      if (!response.aiAnalysis) {
        uniqueMap.set(key, response);
      }
    });
    
    // 그 다음 reports 폴더 데이터를 추가 (AI 분석이 있는 것을 우선)
    responses.forEach(response => {
      const key = `${response.workspaceName}-${response.surveyFolderName}-${response.studentInfo.name}`;
      if (response.aiAnalysis) {
        uniqueMap.set(key, response); // AI 분석이 있는 것으로 덮어쓰기
      }
    });
    
    return Array.from(uniqueMap.values());
  }

  /**
   * 특정 워크스페이스의 리포트 파일들을 조회합니다 (reports 폴더)
   */
  static async listWorkspaceReports(workspaceName: string): Promise<SurveyResponse[]> {
    try {
      console.log('📋 워크스페이스 리포트 파일 조회:', workspaceName);
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: `reports/${workspaceName}/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log('📋 워크스페이스 리포트 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const reports: SurveyResponse[] = [];
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const reportData = await fileResponse.json();
              // s3Key 정보 추가 (중요!)
              reportData.s3Key = object.Key;
              reports.push(reportData);
              console.log('✅ 워크스페이스 리포트 파일 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ 워크스페이스 리포트 파일 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ 워크스페이스 리포트 파일 파싱 실패:', object.Key, error);
          }
        }
      }

      console.log('📋 워크스페이스 총 로드된 리포트:', reports.length, '개');
      return reports;
      
    } catch (error) {
      console.error('❌ 워크스페이스 리포트 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 워크스페이스의 응답 파일들을 조회합니다 (기존 호환성을 위해 유지)
   * @deprecated listWorkspaceReports 사용을 권장합니다
   */
  static async listWorkspaceResponses(workspaceName: string): Promise<SurveyResponse[]> {
    console.warn('⚠️ listWorkspaceResponses는 deprecated입니다. listWorkspaceReports 사용을 권장합니다.');
    return this.listWorkspaceReports(workspaceName);
  }

  /**
   * 특정 워크스페이스의 특정 설문 리포트 파일들을 조회합니다 (reports 폴더)
   */
  static async listSurveyReports(workspaceName: string, surveyFolderName: string): Promise<SurveyResponse[]> {
    try {
      console.log('📋 설문별 리포트 파일 조회:', { workspaceName, surveyFolderName });
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: `reports/${workspaceName}/${surveyFolderName}/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log('📋 설문별 리포트 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const reports: SurveyResponse[] = [];
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const reportData = await fileResponse.json();
              // s3Key 정보 추가 (중요!)
              reportData.s3Key = object.Key;
              reports.push(reportData);
              console.log('✅ 설문별 리포트 파일 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ 설문별 리포트 파일 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ 설문별 리포트 파일 파싱 실패:', object.Key, error);
          }
        }
      }

      console.log('📋 설문별 총 로드된 리포트:', reports.length, '개');
      return reports;
      
    } catch (error) {
      console.error('❌ 설문별 리포트 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 워크스페이스의 특정 설문 응답 파일들을 조회합니다 (기존 호환성을 위해 유지)
   * @deprecated listSurveyReports 사용을 권장합니다
   */
  static async listSurveyResponses(workspaceName: string, surveyFolderName: string): Promise<SurveyResponse[]> {
    console.warn('⚠️ listSurveyResponses는 deprecated입니다. listSurveyReports 사용을 권장합니다.');
    return this.listSurveyReports(workspaceName, surveyFolderName);
  }

  /**
   * 워크스페이스의 설문 폴더 목록을 가져옵니다 (reports 기준)
   */
  static async listSurveyFolders(workspaceName: string): Promise<string[]> {
    try {
      console.log('📋 워크스페이스 설문 폴더 목록 조회:', workspaceName);
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: `reports/${workspaceName}/`,
        Delimiter: '/',
        MaxKeys: 100,
      });

      const response = await s3Client.send(command);
      console.log('📋 S3 폴더 목록:', response.CommonPrefixes?.length || 0, '개');

      if (!response.CommonPrefixes) {
        return [];
      }

      const folderNames: string[] = [];
      
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          // reports/{workspaceName}/{surveyFolderName}/ 에서 surveyFolderName만 추출
          const parts = prefix.Prefix.split('/');
          const surveyFolderName = parts[parts.length - 2]; // 마지막 빈 문자열 제외하고 그 앞
          if (surveyFolderName) {
            folderNames.push(surveyFolderName);
            console.log('✅ 발견된 설문 폴더:', surveyFolderName);
          }
        }
      }

      console.log('📋 총 발견된 설문 폴더:', folderNames.length, '개');
      return folderNames;
      
    } catch (error) {
      console.error('❌ S3 설문 폴더 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 워크스페이스의 설문 파일 목록을 가져옵니다
   */
  static async listSurveyFiles(workspaceName: string): Promise<string[]> {
    try {
      console.log('📋 워크스페이스 설문 파일 목록 조회:', workspaceName);
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: `forms/${workspaceName}/`,
        MaxKeys: 100,
      });

      const response = await s3Client.send(command);
      console.log('📋 S3 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const filenames: string[] = [];
      
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.xlsx')) {
          // forms/{workspaceName}/filename.xlsx에서 filename.xlsx만 추출
          const filename = object.Key.split('/').pop();
          if (filename) {
            filenames.push(filename);
            console.log('✅ 발견된 엑셀 파일:', filename);
          }
        }
      }

      console.log('📋 총 발견된 엑셀 파일:', filenames.length, '개');
      return filenames;
      
    } catch (error) {
      console.error('❌ S3 파일 목록 조회 실패:', error);
      
      // 실패 시 기본 파일명 반환
      const commonFilenames = [
        'survey.xlsx',
        'questions.xlsx',
        'AI역량진단_문항템플릿.xlsx',
        `${workspaceName}_survey.xlsx`,
      ];
      
      return commonFilenames;
    }
  }

  /**
   * AWS 설정이 올바른지 확인합니다
   */
  static validateConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    // AWS 자격증명은 프론트엔드에서 체크하지 않음 (보안상 위험)
    if (!AWS_CONFIG.region) missing.push('REACT_APP_AWS_REGION');
    if (!AWS_CONFIG.bucketName) missing.push('REACT_APP_S3_BUCKET_NAME');

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * S3에서 AI 분석이 완료된 리포트만 조회합니다 (reports/.../AI/ 폴더)
   */
  static async listAllAIAnalyzedReports(): Promise<SurveyResponse[]> {
    try {
      console.log('📋 S3에서 AI 분석 완료 리포트 조회 시작');
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: 'reports/',
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log('📋 S3 전체 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const reports: SurveyResponse[] = [];
      
      // /AI/ 경로가 포함된 JSON 파일만 필터링
      const aiFiles = response.Contents.filter(object => 
        object.Key && 
        object.Key.includes('/AI/') && 
        object.Key.endsWith('.json')
      );
      
      console.log('🤖 AI 분석 파일:', aiFiles.length, '개');
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of aiFiles) {
        if (object.Key) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const reportData = await fileResponse.json();
              // s3Key 정보 추가 (중요!)
              reportData.s3Key = object.Key;
              reports.push(reportData);
              console.log('✅ AI 분석 리포트 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ AI 분석 리포트 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ AI 분석 리포트 파싱 실패:', object.Key, error);
          }
        }
      }

      console.log('📋 총 로드된 AI 분석 리포트:', reports.length, '개');
      
      // 날짜순 정렬 (최신순)
      const sortedReports = reports.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      return sortedReports;
      
    } catch (error) {
      console.error('❌ S3 AI 분석 리포트 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 워크스페이스의 AI 분석이 완료된 리포트만 조회합니다
   */
  static async listWorkspaceAIAnalyzedReports(workspaceName: string): Promise<SurveyResponse[]> {
    try {
      console.log('📋 워크스페이스 AI 분석 리포트 조회:', workspaceName);
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: `reports/${workspaceName}/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log('📋 워크스페이스 전체 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const reports: SurveyResponse[] = [];
      
      // /AI/ 경로가 포함된 JSON 파일만 필터링
      const aiFiles = response.Contents.filter(object => 
        object.Key && 
        object.Key.includes('/AI/') && 
        object.Key.endsWith('.json')
      );
      
      console.log('🤖 워크스페이스 AI 분석 파일:', aiFiles.length, '개');
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of aiFiles) {
        if (object.Key) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const reportData = await fileResponse.json();
              // s3Key 정보 추가 (중요!)
              reportData.s3Key = object.Key;
              reports.push(reportData);
              console.log('✅ 워크스페이스 AI 분석 리포트 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ 워크스페이스 AI 분석 리포트 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ 워크스페이스 AI 분석 리포트 파싱 실패:', object.Key, error);
          }
        }
      }

      console.log('📋 워크스페이스 총 로드된 AI 분석 리포트:', reports.length, '개');
      
      // 날짜순 정렬 (최신순)
      const sortedReports = reports.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      return sortedReports;
      
    } catch (error) {
      console.error('❌ 워크스페이스 AI 분석 리포트 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 워크스페이스의 특정 설문 AI 분석 리포트만 조회합니다
   */
  static async listSurveyAIAnalyzedReports(workspaceName: string, surveyFolderName: string): Promise<SurveyResponse[]> {
    try {
      console.log('📋 설문별 AI 분석 리포트 조회:', { workspaceName, surveyFolderName });
      
      const command = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.bucketName,
        Prefix: `reports/${workspaceName}/${surveyFolderName}/AI/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log('📋 설문별 AI 분석 파일 목록:', response.Contents?.length || 0, '개');

      if (!response.Contents) {
        return [];
      }

      const reports: SurveyResponse[] = [];
      
      // 각 JSON 파일을 다운로드해서 파싱
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const fileUrl = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${object.Key}`;
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const reportData = await fileResponse.json();
              // s3Key 정보 추가 (중요!)
              reportData.s3Key = object.Key;
              reports.push(reportData);
              console.log('✅ 설문별 AI 분석 리포트 로드 성공:', object.Key);
            } else {
              console.warn('⚠️ 설문별 AI 분석 리포트 로드 실패:', object.Key, fileResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ 설문별 AI 분석 리포트 파싱 실패:', object.Key, error);
          }
        }
      }

      console.log('📋 설문별 총 로드된 AI 분석 리포트:', reports.length, '개');
      
      // 날짜순 정렬 (최신순)
      const sortedReports = reports.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      return sortedReports;
      
    } catch (error) {
      console.error('❌ 설문별 AI 분석 리포트 목록 조회 실패:', error);
      return [];
    }
  }
}

export default S3Service; 