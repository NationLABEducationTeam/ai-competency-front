import { create } from 'zustand';
import { Report, CategoryScore } from '../types';

interface ReportStore {
  reports: Report[];
  selectedReports: string[];
  addReport: (report: Report) => void;
  getAllReports: () => Report[];
  getReportsByWorkspace: (workspaceId: string) => Report[];
  getReportById: (id: string) => Report | undefined;
  toggleReportSelection: (reportId: string) => void;
  selectAllReports: (workspaceId: string) => void;
  clearSelection: () => void;
  generateAIAnalysis: (reportId: string) => Promise<void>;
}

// Mock AI 분석 함수 (실제로는 Bedrock API 호출)
const generateMockAIAnalysis = (responses: any[], categoryScores: CategoryScore[]) => {
  const overallPercentage = categoryScores.reduce((sum, cat) => sum + cat.percentage, 0) / categoryScores.length;
  
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  
  categoryScores.forEach(category => {
    if (category.percentage >= 80) {
      strengths.push(`${category.category} 영역에서 우수한 역량을 보유하고 있습니다.`);
    } else if (category.percentage < 60) {
      weaknesses.push(`${category.category} 영역의 역량 개발이 필요합니다.`);
      recommendations.push(`${category.category} 관련 교육 프로그램 참여를 권장합니다.`);
    }
  });
  
  let summary = '';
  if (overallPercentage >= 80) {
    summary = 'AI 역량 전반에 걸쳐 우수한 수준을 보이고 있습니다. 현재 역량을 바탕으로 더욱 전문적인 AI 프로젝트에 도전해보시기 바랍니다.';
  } else if (overallPercentage >= 60) {
    summary = 'AI 역량의 기초는 잘 갖추어져 있으나, 일부 영역에서 추가적인 학습이 필요합니다. 체계적인 학습 계획을 수립하여 역량을 강화하시기 바랍니다.';
  } else {
    summary = 'AI 역량 개발을 위한 기초 학습이 필요합니다. 단계별 학습 계획을 수립하여 체계적으로 역량을 쌓아가시기 바랍니다.';
  }
  
  return { strengths, weaknesses, recommendations, summary };
};

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [
    // Mock 데이터
    {
      id: 'report-1',
      studentId: 'student-1',
      surveyId: 'ai-competency-assessment',
      workspaceId: '2', // 숙명여대
      responseId: 'response-1',
      studentInfo: {
        name: '김민지',
        organization: '숙명여자대학교',
        age: '22',
        email: 'minji.kim@sookmyung.ac.kr',
        education: '학사재학',
        major: '컴퓨터과학과'
      },
      responses: [],
      overallScore: 3.4,
      categoryScores: [
        { category: 'AI/데이터 기본 이해', score: 18, maxScore: 30, percentage: 60, level: 'average' },
        { category: '문제 해결/적용 역량', score: 25, maxScore: 35, percentage: 71, level: 'good' },
        { category: '데이터 이해 및 해석 능력', score: 22, maxScore: 30, percentage: 73, level: 'good' },
        { category: 'AI 관련 협업/소통 능력', score: 16, maxScore: 30, percentage: 53, level: 'needs_improvement' },
        { category: 'AI/기술 트렌드 민감도', score: 28, maxScore: 40, percentage: 70, level: 'good' },
        { category: 'AI 윤리 및 거버넌스 인식', score: 20, maxScore: 30, percentage: 67, level: 'average' }
      ],
      aiAnalysis: {
        strengths: [
          '문제 해결/적용 역량 영역에서 우수한 역량을 보유하고 있습니다.',
          '데이터 이해 및 해석 능력이 양호한 수준입니다.',
          'AI/기술 트렌드에 대한 관심과 이해도가 높습니다.'
        ],
        weaknesses: [
          'AI 관련 협업/소통 능력의 역량 개발이 필요합니다.',
          'AI/데이터 기본 이해 영역의 추가 학습이 필요합니다.'
        ],
        recommendations: [
          'AI 관련 협업/소통 능력 관련 교육 프로그램 참여를 권장합니다.',
          'AI/데이터 기본 이해 관련 교육 프로그램 참여를 권장합니다.',
          '팀 프로젝트를 통한 실무 경험 축적을 권장합니다.',
          'AI 윤리 관련 세미나 참여를 통한 인식 개선을 권장합니다.'
        ],
        summary: 'AI 역량의 기초는 잘 갖추어져 있으나, 일부 영역에서 추가적인 학습이 필요합니다. 특히 협업/소통 능력과 기본 이해 영역의 강화를 통해 전반적인 AI 역량을 향상시킬 수 있을 것입니다.'
      },
      generatedAt: new Date('2024-03-20')
    },
    {
      id: 'report-2',
      studentId: 'student-2',
      surveyId: 'ai-competency-assessment',
      workspaceId: '2', // 숙명여대
      responseId: 'response-2',
      studentInfo: {
        name: '박서연',
        organization: '숙명여자대학교',
        age: '21',
        email: 'seoyeon.park@sookmyung.ac.kr',
        education: '학사재학',
        major: '데이터사이언스학과'
      },
      responses: [],
      overallScore: 4.1,
      categoryScores: [
        { category: 'AI/데이터 기본 이해', score: 26, maxScore: 30, percentage: 87, level: 'excellent' },
        { category: '문제 해결/적용 역량', score: 28, maxScore: 35, percentage: 80, level: 'excellent' },
        { category: '데이터 이해 및 해석 능력', score: 27, maxScore: 30, percentage: 90, level: 'excellent' },
        { category: 'AI 관련 협업/소통 능력', score: 22, maxScore: 30, percentage: 73, level: 'good' },
        { category: 'AI/기술 트렌드 민감도', score: 32, maxScore: 40, percentage: 80, level: 'excellent' },
        { category: 'AI 윤리 및 거버넌스 인식', score: 24, maxScore: 30, percentage: 80, level: 'excellent' }
      ],
      aiAnalysis: {
        strengths: [
          'AI/데이터 기본 이해 영역에서 우수한 역량을 보유하고 있습니다.',
          '문제 해결/적용 역량 영역에서 우수한 역량을 보유하고 있습니다.',
          '데이터 이해 및 해석 능력 영역에서 우수한 역량을 보유하고 있습니다.',
          'AI/기술 트렌드 민감도 영역에서 우수한 역량을 보유하고 있습니다.',
          'AI 윤리 및 거버넌스 인식 영역에서 우수한 역량을 보유하고 있습니다.'
        ],
        weaknesses: [],
        recommendations: [
          'AI 관련 협업/소통 능력 향상을 위한 팀 프로젝트 참여를 권장합니다.',
          '현재 우수한 역량을 바탕으로 AI 연구 프로젝트 참여를 권장합니다.',
          'AI 관련 인턴십이나 실무 경험을 통한 역량 확장을 권장합니다.'
        ],
        summary: 'AI 역량 전반에 걸쳐 우수한 수준을 보이고 있습니다. 현재 역량을 바탕으로 더욱 전문적인 AI 프로젝트에 도전하고, 실무 경험을 통해 역량을 더욱 발전시키시기 바랍니다.'
      },
      generatedAt: new Date('2024-03-21')
    }
  ],
  selectedReports: [],
  
  addReport: (report) => set((state) => ({
    reports: [...state.reports, report]
  })),
  
  getAllReports: () => {
    const state = get();
    return state.reports;
  },
  
  getReportsByWorkspace: (workspaceId) => {
    const state = get();
    return state.reports.filter(report => report.workspaceId === workspaceId);
  },
  
  getReportById: (id) => {
    const state = get();
    return state.reports.find(report => report.id === id);
  },
  
  toggleReportSelection: (reportId) => set((state) => ({
    selectedReports: state.selectedReports.includes(reportId)
      ? state.selectedReports.filter(id => id !== reportId)
      : [...state.selectedReports, reportId]
  })),
  
  selectAllReports: (workspaceId) => set((state) => {
    const workspaceReports = state.reports.filter(report => report.workspaceId === workspaceId);
    return {
      selectedReports: workspaceReports.map(report => report.id)
    };
  }),
  
  clearSelection: () => set({ selectedReports: [] }),
  
  generateAIAnalysis: async (reportId) => {
    // 실제로는 Bedrock API 호출
    const state = get();
    const report = state.reports.find(r => r.id === reportId);
    if (!report) return;
    
    const aiAnalysis = generateMockAIAnalysis(report.responses, report.categoryScores);
    
    set((state) => ({
      reports: state.reports.map(r => 
        r.id === reportId 
          ? { ...r, aiAnalysis }
          : r
      )
    }));
  }
})); 