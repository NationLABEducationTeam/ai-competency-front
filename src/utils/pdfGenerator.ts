import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Report } from '../types';

export const generateReportPDF = async (report: Report): Promise<void> => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight() - 20; // 상하 여백 10mm씩
    const pageWidth = pdf.internal.pageSize.getWidth() - 20; // 좌우 여백 10mm씩
    
    // AI 분석 데이터가 있는지 확인
    const hasAIAnalysis = report.aiAnalysis && report.aiAnalysis.strengths && report.aiAnalysis.weaknesses;
    
    // 각 섹션을 개별적으로 생성하여 페이지 분할 문제 해결
    const sections = [
      // 첫 번째 페이지: 헤더 + 학생정보 + 종합점수 + 카테고리 분석
      createFirstPageHTML(report),
      // 두 번째 페이지: AI 분석 결과 (있는 경우)
      ...(hasAIAnalysis ? [createAIAnalysisPageHTML(report)] : [])
    ];
    
    // 각 섹션을 개별 페이지로 렌더링
    for (let i = 0; i < sections.length; i++) {
    const element = document.createElement('div');
    element.style.width = '210mm';
      element.style.padding = '10mm';
    element.style.backgroundColor = 'white';
    element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif';
    element.style.lineHeight = '1.6';
    element.style.color = '#1a202c';
      element.style.minHeight = '277mm'; // A4 높이에서 여백 제외
      element.innerHTML = sections[i];
      
      // 임시로 DOM에 추가
      document.body.appendChild(element);
      
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: 'white',
          height: element.scrollHeight,
          windowWidth: element.scrollWidth,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // 이미지가 페이지 높이를 초과하는 경우 스케일 조정
        if (imgHeight > pageHeight) {
          const scale = pageHeight / imgHeight;
          pdf.addImage(imgData, 'PNG', 10, 10, imgWidth * scale, pageHeight);
        } else {
          pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        }
        
      } catch (canvasError) {
        console.error('Canvas 생성 오류:', canvasError);
      } finally {
        // DOM에서 제거
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      }
    }
    
    // PDF 다운로드
    pdf.save(`AI역량진단_${report.studentInfo.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('PDF 생성 중 오류:', error);
    throw error;
  }
};

// 첫 번째 페이지 HTML 생성
const createFirstPageHTML = (report: Report): string => {
  return `
    <!-- 헤더 섹션 -->
    <div style="text-align: center; margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🤖 AI 역량 진단 리포트</h1>
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">AI Competency Assessment Report</p>
      <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">생성일: ${report.generatedAt.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      })}</p>
    </div>
    
    <!-- 학생 정보 카드 -->
    <div style="margin-bottom: 20px; padding: 18px; background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%); border-radius: 12px; border: 1px solid #e0e7ff;">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 700; margin-right: 15px;">
          ${report.studentInfo.name.charAt(0)}
        </div>
        <div>
          <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1e293b;">${report.studentInfo.name}</h2>
          <p style="margin: 0; font-size: 14px; color: #64748b;">${report.studentInfo.organization} · ${report.studentInfo.major}</p>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px;">
        <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">📧 이메일</div>
          <div style="font-weight: 600; color: #1e293b;">${report.studentInfo.email}</div>
        </div>
        <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">🎓 학력</div>
          <div style="font-weight: 600; color: #1e293b;">${report.studentInfo.education}</div>
        </div>
        <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">👤 나이</div>
          <div style="font-weight: 600; color: #1e293b;">${report.studentInfo.age}세</div>
        </div>
      </div>
    </div>
    
    <!-- 종합 점수 섹션 -->
    <div style="margin-bottom: 20px; text-align: center; padding: 25px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 1px solid #bae6fd;">
      <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">📊 종합 AI 역량 점수</h3>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px;">
        <div style="text-align: center;">
          <div style="font-size: 48px; font-weight: 800; color: ${getScoreColor(report.overallScore)}; margin-bottom: 5px; letter-spacing: -2px;">
            ${report.overallScore.toFixed(1)}
          </div>
          <div style="font-size: 16px; color: #64748b; font-weight: 500;">/ 5.0</div>
        </div>
        
        <div style="text-align: center;">
          <div style="background: ${getScoreColor(report.overallScore)}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: 700; margin-bottom: 5px;">
          ${getScoreLevel(report.overallScore)}
          </div>
          <div style="font-size: 12px; color: #64748b;">역량 수준</div>
        </div>
      </div>
      
      <!-- 점수 해석 -->
      <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
          ${getScoreInterpretation(report.overallScore)}
        </p>
      </div>
    </div>
    
    <!-- 카테고리별 상세 분석 -->
    <div style="margin-bottom: 20px;">
      <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        📈 카테고리별 역량 분석
      </h3>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        ${report.categoryScores.map((category: any) => `
          <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 10px; background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.3;">
                ${category.category}
              </div>
              <div style="background: ${getScoreColor(category.percentage / 20)}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                ${category.percentage}%
              </div>
            </div>
            
            <!-- 프로그레스 바 -->
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
              <div style="background: ${getScoreColor(category.percentage / 20)}; height: 100%; width: ${category.percentage}%; border-radius: 4px;"></div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 500;">
                ${category.score} / ${category.maxScore} 점
              </div>
              <div style="font-size: 11px; color: ${getScoreColor(category.percentage / 20)}; font-weight: 600;">
                ${getCategoryLevel(category.percentage)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

// AI 분석 페이지 HTML 생성
const createAIAnalysisPageHTML = (report: Report): string => {
  if (!report.aiAnalysis) return '';
  
  // AI 분석 결과 검증 및 보완
  const validatedAnalysis = {
    strengths: report.aiAnalysis.strengths && report.aiAnalysis.strengths.length > 0 
      ? report.aiAnalysis.strengths 
      : ['AI 기술에 대한 기본적인 이해를 갖추고 있습니다.'],
    weaknesses: report.aiAnalysis.weaknesses && report.aiAnalysis.weaknesses.length > 0 
      ? report.aiAnalysis.weaknesses 
      : ['지속적인 학습과 발전이 필요합니다.'],
    recommendations: report.aiAnalysis.recommendations && report.aiAnalysis.recommendations.length > 0 
      ? report.aiAnalysis.recommendations 
      : ['체계적인 AI 학습 계획을 수립하시기 바랍니다.'],
    summary: report.aiAnalysis.summary && report.aiAnalysis.summary.length > 50 
      ? report.aiAnalysis.summary 
      : `${report.studentInfo.name}님의 AI 역량 진단 결과, 전반적으로 ${report.overallScore >= 4.0 ? '우수한' : report.overallScore >= 3.0 ? '양호한' : '기초적인'} 수준의 AI 역량을 보유하고 계십니다. 

지속적인 학습과 실무 경험을 통해 더욱 발전시켜 나가시기 바랍니다. 특히 강점 영역을 더욱 발전시키고, 개선이 필요한 영역에 대해서는 체계적인 학습 계획을 수립하여 단계별로 역량을 강화해 나가시기를 권장합니다.

AI 기술은 빠르게 발전하는 분야이므로, 최신 트렌드에 대한 지속적인 관심과 학습을 통해 전문성을 유지하고 발전시켜 나가시기 바랍니다.`
  };
  
  console.log('🔍 PDF용 AI 분석 결과 검증:', {
    summaryLength: validatedAnalysis.summary.length,
    strengthsCount: validatedAnalysis.strengths.length,
    weaknessesCount: validatedAnalysis.weaknesses.length,
    recommendationsCount: validatedAnalysis.recommendations.length
  });
  
  return `
    <!-- 페이지 헤더 -->
    <div style="text-align: center; margin-bottom: 25px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
      <h2 style="margin: 0; font-size: 24px; font-weight: 700;">🧠 AI 분석 결과 및 맞춤형 추천</h2>
      <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">${report.studentInfo.name}님을 위한 개인화된 분석 리포트</p>
    </div>
    
    <!-- 강점 영역 -->
    <div style="margin-bottom: 20px;">
      <h3 style="color: #059669; margin-bottom: 15px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        💪 주요 강점 영역
      </h3>
      
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 18px; border-radius: 12px; border: 1px solid #bbf7d0;">
        ${validatedAnalysis.strengths.map((strength, index) => `
          <div style="display: flex; align-items: flex-start; margin-bottom: ${index === validatedAnalysis.strengths.length - 1 ? '0' : '12px'}; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
            <div style="background: #10b981; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">
              ${index + 1}
            </div>
            <div style="font-size: 14px; line-height: 1.6; color: #1f2937;">
              ${strength}
            </div>
          </div>
        `).join('')}
      </div>
      </div>
      
    <!-- 개선 영역 -->
      <div style="margin-bottom: 20px;">
      <h3 style="color: #dc2626; margin-bottom: 15px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        📈 개선 필요 영역
      </h3>
      
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%); padding: 18px; border-radius: 12px; border: 1px solid #fecaca;">
        ${validatedAnalysis.weaknesses.map((weakness, index) => `
          <div style="display: flex; align-items: flex-start; margin-bottom: ${index === validatedAnalysis.weaknesses.length - 1 ? '0' : '12px'}; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #ef4444;">
            <div style="background: #ef4444; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">
              ${index + 1}
            </div>
            <div style="font-size: 14px; line-height: 1.6; color: #1f2937;">
              ${weakness}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- 맞춤형 학습 추천 -->
      <div style="margin-bottom: 20px;">
      <h3 style="color: #d97706; margin-bottom: 15px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        💡 맞춤형 학습 추천
      </h3>
      
      <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 18px; border-radius: 12px; border: 1px solid #fde68a;">
        ${validatedAnalysis.recommendations.map((recommendation, index) => `
          <div style="display: flex; align-items: flex-start; margin-bottom: ${index === validatedAnalysis.recommendations.length - 1 ? '0' : '12px'}; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="background: #f59e0b; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">
              ${index + 1}
            </div>
            <div style="font-size: 14px; line-height: 1.6; color: #1f2937;">
              ${recommendation}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- AI 종합 분석 -->
    <div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); border-radius: 12px; border: 1px solid #c7d2fe;">
      <h3 style="color: #4338ca; margin-bottom: 15px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        🧠 AI 종합 분석 및 제언
      </h3>
      
      <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e0e7ff;">
        <p style="margin: 0; line-height: 1.8; color: #1f2937; font-size: 14px;">
          ${validatedAnalysis.summary}
        </p>
      </div>
      
      <div style="margin-top: 12px; padding: 12px; background: rgba(67, 56, 202, 0.1); border-radius: 6px;">
        <p style="margin: 0; font-size: 12px; color: #4338ca; font-weight: 600; text-align: center;">
          💡 이 분석은 AI 기술을 활용하여 생성되었으며, 개인의 성장과 발전을 위한 참고 자료로 활용하시기 바랍니다.
        </p>
      </div>
    </div>
    
    <!-- 푸터 -->
    <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;">
        본 리포트는 AI 역량 진단 시스템에 의해 자동 생성되었습니다.
      </p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        문의사항이 있으시면 관리자에게 연락해 주세요. | 생성 시간: ${new Date().toLocaleString('ko-KR')}
      </p>
    </div>
  `;
};

export const generateMultipleReportsPDF = async (reports: Report[]): Promise<void> => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      
      if (i > 0) {
        pdf.addPage();
      }
      
      // 각 리포트를 PDF에 추가하는 로직
      pdf.setFontSize(20);
      pdf.text(`AI 역량 진단 리포트 - ${report.studentInfo.name}`, 20, 30);
      
      pdf.setFontSize(12);
      let yPosition = 50;
      
      // 학생 정보
      pdf.text('학생 정보:', 20, yPosition);
      yPosition += 10;
      pdf.text(`이름: ${report.studentInfo.name}`, 25, yPosition);
      yPosition += 7;
      pdf.text(`이메일: ${report.studentInfo.email}`, 25, yPosition);
      yPosition += 7;
      pdf.text(`소속: ${report.studentInfo.organization}`, 25, yPosition);
      yPosition += 7;
      pdf.text(`학과: ${report.studentInfo.major}`, 25, yPosition);
      yPosition += 15;
      
      // 종합 점수
      pdf.text(`종합 점수: ${report.overallScore.toFixed(1)} / 5.0`, 20, yPosition);
      yPosition += 15;
      
      // 카테고리별 점수
      pdf.text('카테고리별 점수:', 20, yPosition);
      yPosition += 10;
      
      report.categoryScores.forEach(category => {
        pdf.text(`${category.category}: ${category.score}/${category.maxScore} (${category.percentage}%)`, 25, yPosition);
        yPosition += 7;
      });
      
      yPosition += 10;
      
      // AI 분석 요약
      pdf.text('AI 종합 분석:', 20, yPosition);
      yPosition += 10;
      
      const summaryLines = pdf.splitTextToSize(report.aiAnalysis.summary, 170);
      pdf.text(summaryLines, 25, yPosition);
    }
    
    // PDF 다운로드
    pdf.save(`AI역량진단_일괄다운로드_${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('일괄 PDF 생성 중 오류:', error);
    throw error;
  }
};

// 헬퍼 함수들
const getScoreColor = (score: number): string => {
  if (score >= 4.0) return '#10b981'; // 초록색 - 우수
  if (score >= 3.0) return '#3b82f6'; // 파란색 - 양호  
  if (score >= 2.0) return '#f59e0b'; // 주황색 - 보통
  return '#ef4444'; // 빨간색 - 개선필요
};

const getScoreLevel = (score: number): string => {
  if (score >= 4.0) return '우수';
  if (score >= 3.0) return '양호';
  if (score >= 2.0) return '보통';
  return '개선필요';
};

const getCategoryLevel = (percentage: number): string => {
  if (percentage >= 80) return '우수';
  if (percentage >= 60) return '양호';
  if (percentage >= 40) return '보통';
  return '개선필요';
};

const getScoreInterpretation = (score: number): string => {
  if (score >= 4.5) {
    return '🌟 탁월한 AI 역량을 보유하고 계십니다! 현재 수준을 유지하며 더욱 전문적인 영역으로 발전시켜 나가시기 바랍니다.';
  } else if (score >= 4.0) {
    return '🎯 우수한 AI 역량을 갖추고 있습니다. 일부 영역의 보완을 통해 전문가 수준으로 성장할 수 있습니다.';
  } else if (score >= 3.0) {
    return '📈 양호한 AI 기초 역량을 보유하고 있습니다. 지속적인 학습과 실무 경험을 통해 역량을 강화해 나가시기 바랍니다.';
  } else if (score >= 2.0) {
    return '🚀 AI 역량 개발의 기초 단계에 있습니다. 체계적인 학습 계획을 수립하여 단계별로 역량을 향상시켜 나가시기 바랍니다.';
  } else {
    return '💪 AI 역량 개발을 위한 기초 학습이 필요합니다. 기본 개념부터 차근차근 학습하여 탄탄한 기반을 마련하시기 바랍니다.';
  }
}; 