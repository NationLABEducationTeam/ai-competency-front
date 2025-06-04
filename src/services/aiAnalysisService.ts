interface AIAnalysisRequest {
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
  workspaceName?: string;
  surveyFolderName?: string;
  surveyId?: string;
  submittedAt?: string;
  s3Key?: string;
}

interface AIAnalysisResponse {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
}

export class AIAnalysisService {
  private static readonly LAMBDA_URL = 'https://di7es2pgfqacz7j6oxqqj5sizm0sqkhp.lambda-url.ap-northeast-2.on.aws/';

  /**
   * Lambda + Bedrock API를 호출하여 AI 역량 분석을 수행합니다
   */
  static async analyzeCompetency(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      console.log('🤖 AI 분석 요청 시작:', data.studentInfo.name);
      console.log('📤 Lambda로 전송할 데이터:', data);
      
      // Lambda 함수가 기대하는 형식으로 데이터 변환
      const lambdaPayload = {
        user_responses: data.answers,  // Lambda가 기대하는 필드명
        assessment_type: 'comprehensive',
        student_info: {
          name: data.studentInfo.name,
          organization: data.studentInfo.organization,
          major: data.studentInfo.major,
          age: data.studentInfo.age,
          email: data.studentInfo.email,
          education: data.studentInfo.education
        },
        category_scores: data.categoryScores,
        overall_score: data.overallScore,
        ...(data.workspaceName && { workspace_name: data.workspaceName }),
        ...(data.surveyFolderName && { survey_folder_name: data.surveyFolderName }),
        ...(data.surveyId && { survey_id: data.surveyId }),
        ...(data.submittedAt && { submitted_at: data.submittedAt }),
        ...(data.s3Key && { s3_key: data.s3Key })
      };

      console.log('📤 Lambda 페이로드:', lambdaPayload);
      
      // Lambda API 호출
      const response = await fetch(this.LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lambdaPayload),
      });

      if (!response.ok) {
        throw new Error(`Lambda API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🤖 Lambda 원본 응답:', result);

      // Lambda 응답 파싱 (body 필드가 있는 경우 처리)
      let analysisResult;
      if (result.body) {
        // Lambda가 body 필드로 감싸서 반환하는 경우
        analysisResult = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
      } else {
        analysisResult = result;
      }

      console.log('🤖 파싱된 분석 결과:', analysisResult);

      // Lambda 응답에서 analysis 필드 추출
      const analysis = analysisResult.analysis || analysisResult;
      
      console.log('🔍 분석 데이터 상세:', {
        strengths: analysis.strengths,
        improvement_areas: analysis.improvement_areas,
        recommendations: analysis.recommendations,
        detailed_analysis: analysis.detailed_analysis
      });
      
      // AI 분석 결과를 프론트엔드 형식으로 변환
      const aiAnalysis: AIAnalysisResponse = {
        strengths: analysis.strengths || this.generateFallbackStrengths(data.categoryScores),
        weaknesses: analysis.improvement_areas || this.generateFallbackWeaknesses(data.categoryScores),
        recommendations: this.extractRecommendations(analysis) || this.generateFallbackRecommendations(data.categoryScores),
        summary: this.generateSummaryFromDetailedAnalysis(analysis.detailed_analysis, data.studentInfo.name) ||
                analysis.summary || 
                this.generateFallbackSummary(data.studentInfo.name, data.overallScore)
      };

      console.log('✅ AI 분석 완료:', aiAnalysis);
      return aiAnalysis;

    } catch (error) {
      console.error('❌ AI 분석 실패:', error);
      
      // 오류 발생 시 fallback 분석 결과 반환
      return this.generateFallbackAnalysis(data);
    }
  }

  /**
   * Fallback AI 분석 결과 생성 (API 실패 시 사용)
   */
  private static generateFallbackAnalysis(data: AIAnalysisRequest): AIAnalysisResponse {
    console.log('🔄 Fallback AI 분석 생성');
    
    return {
      strengths: this.generateFallbackStrengths(data.categoryScores),
      weaknesses: this.generateFallbackWeaknesses(data.categoryScores),
      recommendations: this.generateFallbackRecommendations(data.categoryScores),
      summary: this.generateFallbackSummary(data.studentInfo.name, data.overallScore)
    };
  }

  private static generateFallbackStrengths(categoryScores: AIAnalysisRequest['categoryScores']): string[] {
    const strengths: string[] = [];
    
    categoryScores.forEach(category => {
      if (category.percentage >= 80) {
        strengths.push(`${category.category} 영역에서 우수한 역량을 보유하고 있습니다.`);
      } else if (category.percentage >= 70) {
        strengths.push(`${category.category} 영역에서 양호한 수준의 역량을 보여줍니다.`);
      }
    });

    if (strengths.length === 0) {
      strengths.push('기본적인 AI 역량의 토대를 갖추고 있습니다.');
    }

    return strengths;
  }

  private static generateFallbackWeaknesses(categoryScores: AIAnalysisRequest['categoryScores']): string[] {
    const weaknesses: string[] = [];
    
    categoryScores.forEach(category => {
      if (category.percentage < 60) {
        weaknesses.push(`${category.category} 영역의 추가적인 학습과 경험이 필요합니다.`);
      }
    });

    if (weaknesses.length === 0) {
      weaknesses.push('전반적으로 균형잡힌 역량을 보유하고 있으나, 지속적인 발전이 필요합니다.');
    }

    return weaknesses;
  }

  private static generateFallbackRecommendations(categoryScores: AIAnalysisRequest['categoryScores']): string[] {
    const recommendations: string[] = [];
    
    categoryScores.forEach(category => {
      if (category.percentage < 60) {
        recommendations.push(`${category.category} 관련 교육 프로그램이나 실습 기회를 적극 활용하시기 바랍니다.`);
      }
    });

    // 일반적인 추천사항 추가
    recommendations.push('AI 관련 프로젝트나 스터디 그룹에 참여하여 실무 경험을 쌓으시기 바랍니다.');
    recommendations.push('최신 AI 트렌드와 기술 동향을 지속적으로 학습하시기 바랍니다.');

    return recommendations;
  }

  private static generateFallbackSummary(studentName: string, overallScore: number): string {
    if (overallScore >= 4.0) {
      return `${studentName} 학생은 AI 역량 전반에 걸쳐 우수한 수준을 보이고 있습니다. 현재의 역량을 바탕으로 더욱 전문적이고 도전적인 AI 프로젝트에 참여하여 리더십을 발휘하시기 바랍니다.`;
    } else if (overallScore >= 3.0) {
      return `${studentName} 학생은 AI 역량의 기초를 잘 갖추고 있으며, 일부 영역에서 우수한 성과를 보이고 있습니다. 지속적인 학습과 실무 경험을 통해 전문가 수준으로 발전할 수 있을 것입니다.`;
    } else if (overallScore >= 2.0) {
      return `${studentName} 학생은 AI 역량 개발의 기초 단계에 있습니다. 체계적인 학습 계획을 수립하고 단계별로 역량을 강화해 나가시기 바랍니다.`;
    } else {
      return `${studentName} 학생은 AI 역량 개발을 위한 기초 학습이 필요합니다. 기본 개념부터 차근차근 학습하여 탄탄한 기반을 마련하시기 바랍니다.`;
    }
  }

  /**
   * Lambda 응답에서 추천사항 추출
   */
  private static extractRecommendations(analysis: any): string[] | null {
    if (analysis.recommendations) {
      if (Array.isArray(analysis.recommendations)) {
        return analysis.recommendations;
      } else if (analysis.recommendations.immediate_actions) {
        // Lambda 응답 형식에 맞춰 추천사항 추출
        const recommendations: string[] = [];
        if (analysis.recommendations.immediate_actions && Array.isArray(analysis.recommendations.immediate_actions)) {
          recommendations.push(...analysis.recommendations.immediate_actions);
        }
        if (analysis.recommendations.learning_resources && Array.isArray(analysis.recommendations.learning_resources)) {
          recommendations.push(...analysis.recommendations.learning_resources);
        }
        if (analysis.recommendations.skill_development_path && typeof analysis.recommendations.skill_development_path === 'string') {
          recommendations.push(analysis.recommendations.skill_development_path);
        }
        return recommendations;
      }
    }
    return null;
  }

  /**
   * 상세 분석에서 요약 생성
   */
  private static generateSummaryFromDetailedAnalysis(detailedAnalysis: any, studentName: string): string {
    if (typeof detailedAnalysis === 'string') {
      return detailedAnalysis;
    }
    
    // 객체 형태의 상세 분석에서 요약 생성
    const analysisTexts = Object.values(detailedAnalysis).filter(text => typeof text === 'string');
    if (analysisTexts.length > 0) {
      return `${studentName} 학생의 AI 역량 분석 결과: ${analysisTexts.join(' ')}`;
    }
    
    return `${studentName} 학생의 AI 역량 분석이 완료되었습니다.`;
  }
} 