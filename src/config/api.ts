// 환경별 API BASE URL 설정
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  let baseUrl = '';
  
  // localhost에서 개발할 때
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    baseUrl = 'http://3.35.230.242:8081';
    console.log('🔧 [API CONFIG] 개발 환경 감지 - 3.35.230.242:8081로 API 요청');
  } else {
    // S3 배포 환경일 때
    baseUrl = 'http://3.35.230.242:8080';
    console.log('🚀 [API CONFIG] 배포 환경 감지 - 3.35.230.242:8080으로 API 요청');
  }
  
  console.log(`📡 [API CONFIG] BASE_URL 설정: ${baseUrl}`);
  console.log(`🌐 [API CONFIG] 현재 hostname: ${hostname}`);
  
  return baseUrl;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  API_PREFIX: '/api/v1',
  ENDPOINTS: {
    // 인증
    LOGOUT: '/api/v1/auth/logout',
    REGISTER: '/api/v1/auth/register',
    ME: '/api/v1/auth/me',
    
    // 워크스페이스
    WORKSPACES: '/api/v1/workspaces/',
    WORKSPACE_DETAIL: '/api/v1/workspaces',
    WORKSPACE_CATEGORIES: '/api/v1/workspaces/{id}/categories',
    
    // 설문
    SURVEYS: '/api/v1/surveys/',
    SURVEYS_BY_WORKSPACE: '/api/v1/surveys/workspace/{workspace_id}',
    SURVEY_DETAIL: '/api/v1/surveys',
    SURVEY_UPLOAD: '/api/v1/surveys/{id}/upload',
    
    // 평가 (학생용)
    ASSESSMENT_INFO: '/api/v1/assessment/{survey_id}',
    ASSESSMENT_START: '/api/v1/assessment/{survey_id}/start',
    
    // 대시보드
    DASHBOARD_OVERVIEW: '/api/v1/dashboard/overview',
    DASHBOARD_STATS: '/api/v1/dashboard/stats',
    
    // 리포트
    REPORTS: '/api/v1/reports/',
    REPORT_DETAIL: '/api/v1/reports',
    
    // 파일
    UPLOAD_EXCEL: '/api/v1/files/upload/excel',
    EXCEL_TEMPLATE: '/api/v1/files/template/excel',
  },
  
  // Lambda 서비스
  LAMBDA: {
    EMAIL_SERVICE: 'https://ieruo5x3ppwkcjqnehupd4oo4y0hcagx.lambda-url.ap-northeast-2.on.aws/',
  },
  
  // AWS S3 설정
  S3: {
    BUCKET_NAME: 'competency-surveys',
  },
  
  // 요청 설정
  TIMEOUT: 30000,
  
  // 헤더 설정
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// API 기본 URL
export const API_BASE_URL = API_CONFIG.BASE_URL;

// 전체 엔드포인트 URL 생성 함수
export const getApiUrl = (endpoint: string, params?: Record<string, string>) => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });
  }
  
  return url;
}; 