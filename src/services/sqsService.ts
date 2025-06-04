interface SQSAnalysisRequest {
  studentInfo: {
    name: string;
    organization: string;
    age: number;
    email: string;
    education: string;
    major: string;
  };
  answers: { [questionText: string]: number };
  categoryScores: Array<{
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  overallScore: number;
  workspaceName: string;
  surveyFolderName: string;
  surveyId?: string;
  submittedAt: string;
  s3Key: string;
}

export class SQSService {
  // API Gateway 엔드포인트 (나중에 실제 URL로 변경)
  private static readonly API_GATEWAY_URL = 'https://your-api-gateway-url/send-analysis';
  
  /**
   * SQS를 통해 AI 분석 요청을 비동기로 전송합니다
   */
  static async sendAnalysisRequest(data: SQSAnalysisRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📤 SQS로 AI 분석 요청 전송 시작:', data.studentInfo.name);
      console.log('📊 전송할 데이터:', {
        studentName: data.studentInfo.name,
        workspaceName: data.workspaceName,
        surveyFolderName: data.surveyFolderName,
        answersCount: Object.keys(data.answers).length,
        overallScore: data.overallScore,
        s3Key: data.s3Key
      });
      
      // API Gateway를 통해 SQS에 메시지 전송
      const response = await fetch(this.API_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // SQS 메시지 본문
          MessageBody: JSON.stringify(data),
          // 메시지 속성 (선택사항)
          MessageAttributes: {
            studentName: {
              DataType: 'String',
              StringValue: data.studentInfo.name
            },
            workspaceName: {
              DataType: 'String', 
              StringValue: data.workspaceName
            },
            submittedAt: {
              DataType: 'String',
              StringValue: data.submittedAt
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQS 메시지 전송 실패: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ SQS 메시지 전송 성공:', result);
      
      return {
        success: true,
        messageId: result.MessageId || 'unknown'
      };

    } catch (error) {
      console.error('❌ SQS 메시지 전송 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 직접 SQS API 호출 (AWS SDK 사용 - 브라우저에서는 CORS 문제 있을 수 있음)
   */
  static async sendDirectToSQS(data: SQSAnalysisRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📤 SQS 직접 호출 시작:', data.studentInfo.name);
      
      // 임시로 fetch를 사용한 SQS 호출 (실제로는 AWS SDK 사용 권장)
      const sqsUrl = 'https://sqs.ap-northeast-2.amazonaws.com/471112588210/ai-analysis-que';
      
      const params = new URLSearchParams({
        'Action': 'SendMessage',
        'MessageBody': JSON.stringify(data),
        'Version': '2012-11-05'
      });

      const response = await fetch(sqsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          // AWS 인증 헤더 필요 (실제 구현 시)
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`SQS 직접 호출 실패: ${response.status}`);
      }

      const result = await response.text();
      console.log('✅ SQS 직접 호출 성공:', result);
      
      return {
        success: true,
        messageId: 'direct-call-success'
      };

    } catch (error) {
      console.error('❌ SQS 직접 호출 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 테스트용 Mock 전송 (개발 중 사용)
   */
  static async sendMockRequest(data: SQSAnalysisRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('🧪 Mock SQS 요청 전송:', data.studentInfo.name);
    console.log('📊 Mock 데이터:', {
      studentName: data.studentInfo.name,
      workspaceName: data.workspaceName,
      answersCount: Object.keys(data.answers).length,
      overallScore: data.overallScore
    });
    
    // 1초 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Mock SQS 요청 완료');
    return {
      success: true,
      messageId: `mock-${Date.now()}`
    };
  }

  /**
   * S3에서 AI 분석 결과 확인 (처리 완료 여부 체크)
   */
  static async checkAnalysisStatus(s3Key: string): Promise<{ completed: boolean; hasAIAnalysis: boolean; error?: string }> {
    try {
      console.log('🔍 AI 분석 처리 상태 확인:', s3Key);
      
      // S3에서 파일 조회
      const fileUrl = `https://competency-surveys.s3.ap-northeast-2.amazonaws.com/${s3Key}`;
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { completed: false, hasAIAnalysis: false, error: '파일이 아직 생성되지 않았습니다' };
        }
        throw new Error(`S3 파일 조회 실패: ${response.status}`);
      }
      
      const data = await response.json();
      
      // AI 분석 결과 확인
      const hasAIAnalysis = !!(data.aiAnalysis && 
                              data.aiAnalysis.strengths && 
                              data.aiAnalysis.weaknesses && 
                              data.aiAnalysis.recommendations && 
                              data.aiAnalysis.summary);
      
      console.log('📊 분석 상태:', {
        파일존재: true,
        AI분석완료: hasAIAnalysis,
        분석시간: data.aiAnalysis?.analyzedAt || '없음'
      });
      
      return {
        completed: true,
        hasAIAnalysis: hasAIAnalysis
      };
      
    } catch (error) {
      console.error('❌ 분석 상태 확인 실패:', error);
      return {
        completed: false,
        hasAIAnalysis: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 주기적으로 분석 완료 상태를 체크 (폴링)
   */
  static async pollAnalysisStatus(
    s3Key: string, 
    maxAttempts: number = 10, 
    intervalMs: number = 30000,
    onStatusUpdate?: (status: { completed: boolean; hasAIAnalysis: boolean; attempt: number }) => void
  ): Promise<{ completed: boolean; hasAIAnalysis: boolean }> {
    console.log('🔄 AI 분석 완료 대기 시작:', { s3Key, maxAttempts, intervalMs });
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 분석 상태 확인 시도 ${attempt}/${maxAttempts}`);
      
      const status = await this.checkAnalysisStatus(s3Key);
      
      if (onStatusUpdate) {
        onStatusUpdate({ ...status, attempt });
      }
      
      if (status.completed && status.hasAIAnalysis) {
        console.log('✅ AI 분석 완료 확인!');
        return { completed: true, hasAIAnalysis: true };
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏳ ${intervalMs/1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    console.log('⏰ 최대 시도 횟수 도달, 분석 미완료');
    return { completed: false, hasAIAnalysis: false };
  }
} 