import { create } from 'zustand';

interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  scoreScale: number;
  questions: Question[];
  link: string;
  createdAt: Date;
  isActive: boolean;
  responses: number;
}

interface SurveyStore {
  surveys: Survey[];
  addSurvey: (survey: Survey) => void;
  getSurveyById: (id: string) => Survey | undefined;
  updateSurveyResponses: (id: string) => void;
}

export const useSurveyStore = create<SurveyStore>((set, get) => ({
  surveys: [
    // 기본 AI 역량 진단 설문
    {
      id: 'ai-competency-assessment',
      title: 'AI 기반 직무역량 자가진단 설문',
      description: 'AI/데이터 기본 이해부터 윤리 및 거버넌스까지 종합적인 AI 역량을 진단합니다',
      scoreScale: 5,
      questions: [
        // AI/데이터 기본 이해 (6문항)
        { id: 'q1', text: '머신러닝과 딥러닝의 차이를 실무적으로 설명할 수 있다.', category: 'AI/데이터 기본 이해', order: 1 },
        { id: 'q2', text: 'AI가 내 업무에 적용될 수 있는 방식과 제약조건을 구체적으로 이해하고 있다.', category: 'AI/데이터 기본 이해', order: 2 },
        { id: 'q3', text: '시가 총액부터 위치 정보, 텍스트, 이미지, 음성 등의 데이터 종류를 설명할 수 있다.', category: 'AI/데이터 기본 이해', order: 3 },
        { id: 'q4', text: 'AI/데이터 분석 프로젝트의 전체 기획 절차를 설명할 수 있다.', category: 'AI/데이터 기본 이해', order: 4 },
        { id: 'q5', text: '데이터 기반 의사결정의 구조를 설명할 수 있다.', category: 'AI/데이터 기본 이해', order: 5 },
        { id: 'q6', text: 'AI 프로젝트 성공 요인과 한계를 구분하여 설명할 수 있다.', category: 'AI/데이터 기본 이해', order: 6 },
        
        // 문제 해결/적용 역량 (7문항)
        { id: 'q7', text: '현재 수행 중인 업무나 반복 업무를 AI로 개선할 수 있다고 판단한 경험이 있다.', category: '문제 해결/적용 역량', order: 7 },
        { id: 'q8', text: '비즈니스 문제를 데이터 기반으로 구조화한 경험이 있다.', category: '문제 해결/적용 역량', order: 8 },
        { id: 'q9', text: 'AI/데이터 분석으로 개선 효과를 수치화한 경험이 있다.', category: '문제 해결/적용 역량', order: 9 },
        { id: 'q10', text: 'AI/데이터 분석 결과를 업무에 적용하거나 제안한 경험이 있다.', category: '문제 해결/적용 역량', order: 10 },
        { id: 'q11', text: '데이터 기반으로 문제를 해결하거나 의사결정을 한 경험이 있다.', category: '문제 해결/적용 역량', order: 11 },
        { id: 'q12', text: 'AI/데이터 분석 결과를 보고서나 발표로 전달한 경험이 있다.', category: '문제 해결/적용 역량', order: 12 },
        { id: 'q13', text: 'AI/데이터 분석 프로젝트를 주도하거나 참여한 경험이 있다.', category: '문제 해결/적용 역량', order: 13 },
        
        // 데이터 이해 및 해석 능력 (6문항)
        { id: 'q14', text: '주요 지표(KPI)를 스스로 정의하고 데이터를 기반으로 분석한 경험이 있다.', category: '데이터 이해 및 해석 능력', order: 14 },
        { id: 'q15', text: 'SQL 또는 BI 툴을 사용해 데이터를 추출하거나 직접 작성한 경험이 있다.', category: '데이터 이해 및 해석 능력', order: 15 },
        { id: 'q16', text: 'EDA(탐색적 데이터 분석) 절차를 실무에 적용한 경험이 있다.', category: '데이터 이해 및 해석 능력', order: 16 },
        { id: 'q17', text: '데이터 시각화 도구를 사용해 인사이트를 도출한 경험이 있다.', category: '데이터 이해 및 해석 능력', order: 17 },
        { id: 'q18', text: '복수 데이터의 관계를 설명하고 상관관계를 해석한 경험이 있다.', category: '데이터 이해 및 해석 능력', order: 18 },
        { id: 'q19', text: '데이터 기반 분석 결과를 통해 의사결정에 영향을 준 경험이 있다.', category: '데이터 이해 및 해석 능력', order: 19 },
        
        // AI 관련 협업/소통 능력 (6문항)
        { id: 'q20', text: '개발자나 데이터 사이언티스트와 프로젝트 협업을 한 경험이 있다.', category: 'AI 관련 협업/소통 능력', order: 20 },
        { id: 'q21', text: 'AI/데이터 분석 과제를 다른 조직 구성원에게 설명한 경험이 있다.', category: 'AI 관련 협업/소통 능력', order: 21 },
        { id: 'q22', text: '데이터 분석 결과를 시각화하여 발표한 경험이 있다.', category: 'AI 관련 협업/소통 능력', order: 22 },
        { id: 'q23', text: '업무 중 다양한 이해관계자와 데이터 기반 논의를 한 경험이 있다.', category: 'AI 관련 협업/소통 능력', order: 23 },
        { id: 'q24', text: 'AI 기술 도입 관련 제안서를 작성하거나 발표한 경험이 있다.', category: 'AI 관련 협업/소통 능력', order: 24 },
        { id: 'q25', text: 'AI 기술과 관련된 외부 이해관계자(고객사 등)와 소통한 경험이 있다.', category: 'AI 관련 협업/소통 능력', order: 25 },
        
        // AI/기술 트렌드 민감도 (8문항)
        { id: 'q26', text: 'ChatGPT, Claude, Copilot 등 생성형 AI를 실무에 사용한 경험이 있다.', category: 'AI/기술 트렌드 민감도', order: 26 },
        { id: 'q27', text: '최신 AI 기술 또는 API를 업무에 테스트하거나 적용해 본 경험이 있다.', category: 'AI/기술 트렌드 민감도', order: 27 },
        { id: 'q28', text: 'MLOps, AutoML, 데이터 플랫폼 등 기술 키워드에 익숙하다.', category: 'AI/기술 트렌드 민감도', order: 28 },
        { id: 'q29', text: '산업계 최신 AI 도입 트렌드를 뉴스, 세미나 등으로 꾸준히 파악하고 있다.', category: 'AI/기술 트렌드 민감도', order: 29 },
        { id: 'q30', text: 'AI 관련 세미나, 컨퍼런스, 커뮤니티 등에 참여한 경험이 있다.', category: 'AI/기술 트렌드 민감도', order: 30 },
        { id: 'q31', text: '기술 트렌드와 실무 이슈를 연결해 조직에 제안한 경험이 있다.', category: 'AI/기술 트렌드 민감도', order: 31 },
        { id: 'q32', text: 'AI 기반 프로젝트를 사전검토(POC) 또는 적용한 경험이 있다.', category: 'AI/기술 트렌드 민감도', order: 32 },
        { id: 'q33', text: 'AI/데이터 기반 실험에 주도적으로 참여한 경험이 있다.', category: 'AI/기술 트렌드 민감도', order: 33 },
        
        // AI 윤리 및 거버넌스 인식 (6문항)
        { id: 'q34', text: 'AI 시스템의 편향, 공정성, 프라이버시 문제에 대해 인식하고 있다.', category: 'AI 윤리 및 거버넌스 인식', order: 34 },
        { id: 'q35', text: 'AI 결과 해석의 어려움 및 신뢰성 문제를 고려한 적이 있다.', category: 'AI 윤리 및 거버넌스 인식', order: 35 },
        { id: 'q36', text: 'AI/데이터 보안 및 개인정보보호 이슈를 알고 있으며 대처방안을 고민해봤다.', category: 'AI 윤리 및 거버넌스 인식', order: 36 },
        { id: 'q37', text: 'AI 윤리 관련 외부 사례(법, 규제, 사고 등)를 검토한 경험이 있다.', category: 'AI 윤리 및 거버넌스 인식', order: 37 },
        { id: 'q38', text: '조직 내부에서 AI 윤리 지침 또는 가이드를 마련하거나 적용한 경험이 있다.', category: 'AI 윤리 및 거버넌스 인식', order: 38 },
        { id: 'q39', text: 'AI 프로젝트에 있어 사회적 영향이나 윤리 문제를 고려한 경험이 있다.', category: 'AI 윤리 및 거버넌스 인식', order: 39 },
      ],
      link: `/survey/ai-competency-assessment`,
      createdAt: new Date('2024-03-15'),
      isActive: true,
      responses: 45,
    }
  ],
  
  addSurvey: (survey) => set((state) => ({
    surveys: [...state.surveys, survey]
  })),
  
  getSurveyById: (id) => {
    const state = get();
    return state.surveys.find(survey => survey.id === id);
  },
  
  updateSurveyResponses: (id) => set((state) => ({
    surveys: state.surveys.map(survey => 
      survey.id === id 
        ? { ...survey, responses: survey.responses + 1 }
        : survey
    )
  })),
})); 