import { API_CONFIG, getApiUrl } from '../config/api';
import { User, Workspace, Survey, Student, Response, Report, ReportSummary, WorkspaceReport } from '../types';
import axios from 'axios';

// 백엔드 응답 타입 정의
interface SuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface Token {
  access_token: string;
  token_type: string;
}

interface SurveyUploadResponse {
  success: boolean;
  message: string;
  survey_id: string;
  s3_key?: string;
}

interface PresignedUploadResponse {
  success: boolean;
  message: string;
  upload_url: string;
  fields: { [key: string]: string; };
  s3_key: string;
  expires_in: number;
}

interface Category {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  created_at: string;
}

// 보관된 설문 응답 구조
interface ArchivedSurveysResponse {
  surveys: Array<{
    id: string;
    title: string;
    description?: string;
    workspace_id: string;
    workspace_name: string;
    status: string;
    response_count: number;
    created_at: string;
    updated_at: string;
    scale_max?: number;
  }>;
  total_count: number;
}

// 기본 fetch 래퍼 함수
const apiRequest = async <T>(
  endpoint: string, 
  options: RequestInit = {},
  noAuth?: boolean
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // 인증 토큰 가져오기
  const token = localStorage.getItem('access_token');
  const tokenType = localStorage.getItem('token_type') || 'Bearer';
  
  console.log('🔍 API 요청 시작:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    headers: options.headers
  });
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...API_CONFIG.HEADERS,
      ...(!noAuth && token && { Authorization: `${tokenType} ${token}` }),
      ...options.headers,
    },
  };

  // FormData 사용 시 Content-Type 헤더를 제거 (브라우저가 자동으로 설정)
  if (options.body instanceof FormData) {
    console.log('FormData 감지: Content-Type 헤더를 브라우저가 자동 설정하도록 함');
    if (config.headers && 'Content-Type' in config.headers) {
      delete (config.headers as Record<string, any>)['Content-Type'];
    }
  }

  try {
    console.log('📡 Fetch 요청:', { url, method: config.method });
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // 401 Unauthorized 에러 처리
      if (response.status === 401) {
        console.error('❌ 인증 만료: 401 Unauthorized');
        
        // 로컬 스토리지에서 토큰 제거
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        
        // 현재 경로 저장 (로그인 후 돌아갈 경로)
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login') {
          localStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // 사용자에게 알림
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
        
        // 더 이상 진행하지 않도록 에러 던지기
        throw new Error('Session expired');
      }
      
      // 기타 오류 응답의 본문을 확인
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
        console.error('❌ API 오류 응답 본문:', errorText);
      } catch (parseError) {
        console.error('❌ 오류 응답 파싱 실패:', parseError);
      }
      
      console.error('❌ API 에러:', {
        status: response.status,
        statusText: response.statusText,
        url,
        method: config.method,
        errorDetails
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
    
    const data = await response.json();
    console.log('✅ API 응답:', { url, method: config.method, data });
    return data as T;
  } catch (error) {
    console.error('❌ API 요청 실패:', {
      url,
      method: config.method,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

// 인증 관련 API
export const authAPI = {
  login: async (credentials: { email: string; password: string }): Promise<Token> => {
    return apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  register: async (userData: { email: string; password: string }): Promise<SuccessResponse> => {
    return apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  logout: async (): Promise<SuccessResponse> => {
    return apiRequest('/api/v1/auth/logout', {
      method: 'POST',
    });
  },
  
  getCurrentUser: async (): Promise<User> => {
    return apiRequest('/api/v1/auth/me');
  },
};

// 워크스페이스 관련 API
export const workspaceAPI = {
  getAll: async (): Promise<Workspace[]> => {
    try {
      // 먼저 is_active=true 쿼리로 시도
      const result = await apiRequest<Workspace[]>('/api/v1/workspaces/?is_active=true');
      return result;
    } catch (error) {
      console.warn('is_active 쿼리 실패, 전체 목록에서 필터링 시도:', error);
      try {
        // 백엔드에서 is_active를 지원하지 않는 경우 전체 목록을 가져와서 필터링
        const allWorkspaces = await apiRequest<Workspace[]>('/api/v1/workspaces/');
        // is_active 필드가 존재하면 필터링, 없으면 전체 반환
        return allWorkspaces.filter((workspace: any) => 
          workspace.is_active !== false && workspace.status !== 'deleted'
        );
      } catch (fallbackError) {
        console.error('워크스페이스 목록 조회 실패:', fallbackError);
        throw fallbackError;
      }
    }
  },
  
  getById: async (id: string): Promise<Workspace> => {
    return apiRequest(`/api/v1/workspaces/${id}`);
  },
  
  create: async (workspace: { title: string; description?: string; university_name?: string }): Promise<Workspace> => {
    return apiRequest('/api/v1/workspaces/', {
      method: 'POST',
      body: JSON.stringify(workspace),
    });
  },
  
  update: async (id: string, workspace: { title?: string; description?: string; university_name?: string }): Promise<SuccessResponse> => {
    return apiRequest(`/api/v1/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workspace),
    });
  },
  
  delete: async (id: string): Promise<SuccessResponse> => {
    return apiRequest(`/api/v1/workspaces/${id}/hide`, {
      method: 'PUT',
      body: JSON.stringify({ is_visible: false }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // 휴지통 관련
  getTrashedWorkspaces: async (): Promise<{data: { workspaces: any[] }}> => {
    return apiRequest('/api/v1/workspaces/trash');
  },

  moveToTrash: async (id: string): Promise<SuccessResponse> => {
    return apiRequest(`/api/v1/workspaces/${id}/trash`, {
      method: 'POST',
    });
  },

  restoreWorkspace: async (id: string): Promise<SuccessResponse> => {
    return apiRequest(`/api/v1/workspaces/${id}/restore`, {
      method: 'POST',
    });
  },

  deleteWorkspacePermanently: async (id: string): Promise<SuccessResponse> => {
    return apiRequest(`/api/v1/workspaces/${id}/permanent`, {
      method: 'DELETE',
    });
  },

  // 카테고리 관련
  getCategories: async (workspaceId: string): Promise<Category[]> => {
    return apiRequest(`/api/v1/workspaces/${workspaceId}/categories`);
  },

  createCategory: async (workspaceId: string, category: { name: string; description?: string }): Promise<Category> => {
    return apiRequest(`/api/v1/workspaces/${workspaceId}/categories`, {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },
};

// 설문 관련 API
export const surveyAPI = {
  getAll: async (noAuth?: boolean): Promise<Survey[]> => {
    console.log('📡 모든 설문 조회 요청');
    const result = await apiRequest<Survey[]>('/api/v1/surveys/', {}, noAuth);
    console.log('📥 모든 설문 조회 결과:', result);
    return result;
  },
  
  getAllIncludeArchived: async (): Promise<Survey[]> => {
    console.log('📡 보관된 설문 포함 모든 설문 조회 요청');
    const result = await apiRequest<Survey[]>('/api/v1/surveys/?include_archived=true');
    console.log('📥 보관된 설문 포함 모든 설문 조회 결과:', result);
    return result;
  },

  getArchived: async (): Promise<Survey[]> => {
    console.log('📡 보관된 설문만 조회 요청');
    const result = await apiRequest<Survey[]>('/api/v1/surveys/?status=draft');
    console.log('📥 보관된 설문 조회 결과:', result);
    return result;
  },
  
  getByWorkspace: async (workspaceId: string): Promise<Survey[]> => {
    console.log('📡 워크스페이스 설문 조회 요청:', workspaceId);
    const result = await apiRequest<Survey[]>(`/api/v1/surveys/workspace/${workspaceId}`);
    console.log('📥 워크스페이스 설문 조회 결과:', result);
    return result;
  },
  
  getById: async (id: string, noAuth?: boolean): Promise<Survey> => {
    console.log('📡 설문 상세 조회 요청:', id);
    const result = await apiRequest<Survey>(`/api/v1/surveys/${id}`, {}, noAuth);
    console.log('📥 설문 상세 조회 결과:', result);
    return result;
  },
  
  create: async (survey: import('../types').SurveyCreate): Promise<Survey> => {
    console.log('📡 설문 생성 요청:', survey);
    const result = await apiRequest<Survey>('/api/v1/surveys/', {
      method: 'POST',
      body: JSON.stringify(survey),
    });
    console.log('📥 설문 생성 결과:', result);
    return result;
  },
  
  delete: async (id: string): Promise<SuccessResponse> => {
    console.log('📡 설문 삭제 요청:', id);
    const result = await apiRequest<SuccessResponse>(`/api/v1/surveys/${id}`, {
      method: 'DELETE',
    });
    console.log('📥 설문 삭제 결과:', result);
    return result;
  },
  
  uploadExcel: async (surveyId: string, file: File): Promise<SurveyUploadResponse> => {
    console.log('📡 엑셀 파일 업로드 요청:', { 
      surveyId, 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      lastModified: file.lastModified
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    // FormData 내용 확인 (디버깅용)
    console.log('📋 FormData 내용 확인:');
    const entries = Array.from(formData.entries());
    console.log('📋 FormData entries 개수:', entries.length);
    entries.forEach(([key, value]) => {
      if (value instanceof File) {
        console.log(`📋 ${key}:`, {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified
        });
      } else {
        console.log(`📋 ${key}:`, value);
      }
    });
    
    console.log('📤 백엔드로 요청 전송 중...');
    const result = await apiRequest<SurveyUploadResponse>(`/api/v1/surveys/${surveyId}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // FormData 사용 시 Content-Type을 명시적으로 설정하지 않음
        // 브라우저가 자동으로 multipart/form-data와 boundary를 설정
      }, 
    });
    console.log('📥 엑셀 파일 업로드 결과:', result);
    return result;
  },

  getPresignedUploadUrl: async (surveyId: string, filename: string): Promise<PresignedUploadResponse> => {
    console.log('📡 Presigned URL 요청:', { surveyId, filename });
    const result = await apiRequest<PresignedUploadResponse>(`/api/v1/surveys/${surveyId}/presigned-upload`, {
      method: 'POST',
      body: JSON.stringify({ filename }),
    });
    console.log('📥 Presigned URL 응답:', result);
    return result;
  },

  confirmUploadComplete: async (surveyId: string, fileKey: string): Promise<SuccessResponse> => {
    console.log('📡 업로드 완료 확인 요청:', { surveyId, fileKey });
    const result = await apiRequest<SuccessResponse>(`/api/v1/surveys/${surveyId}/upload-complete`, {
      method: 'POST',
      body: JSON.stringify({ file_key: fileKey }),
    });
    console.log('📥 업로드 완료 확인 결과:', result);
    return result;
  },

  updateStatus: async (surveyId: string, status: 'draft' | 'active' | 'inactive'): Promise<SuccessResponse> => {
    console.log('📡 설문 상태 변경 요청:', { surveyId, status });
    const result = await apiRequest<SuccessResponse>(`/api/v1/surveys/${surveyId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    console.log('📥 설문 상태 변경 결과:', result);
    return result;
  },

  submitResponse: async (surveyId: string, data: {
    respondent_name: string;
    respondent_email: string;
    respondent_age?: number;
    respondent_organization?: string;
    respondent_education?: string;
    respondent_major?: string;
    answers: Array<{
      question_id: string;
      score: number;
    }>;
  }, noAuth?: boolean): Promise<any> => {
    console.log('📡 설문 응답 제출 요청:', { surveyId, data });
    const result = await apiRequest(`/api/v1/surveys/${surveyId}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, noAuth);
    console.log('📥 설문 응답 제출 결과:', result);
    return result;
  },

  archive: async (surveyId: string): Promise<any> => {
    console.log('📡 설문 보관 처리 요청:', surveyId);
    const result = await apiRequest(`/api/v1/surveys/${surveyId}/archive`, {
      method: 'POST',
    });
    console.log('📥 설문 보관 처리 결과:', result);
    return result;
  },
};

// 평가 관련 API
export const assessmentAPI = {
  getInfo: async (surveyId: string, noAuth?: boolean): Promise<any> => {
    console.log('📡 설문 정보 조회 요청:', surveyId);
    const result = await apiRequest(`/api/v1/assessment/${surveyId}/info`, {}, noAuth);
    console.log('📥 설문 정보 조회 결과:', result);
    return result;
  },

  start: async (surveyId: string, noAuth?: boolean): Promise<any> => {
    console.log('📡 설문 시작 요청:', surveyId);
    const result = await apiRequest(`/api/v1/assessment/${surveyId}/start`, {
      method: 'POST',
    }, noAuth);
    console.log('📥 설문 시작 결과:', result);
    return result;
  },

  submit: async (surveyId: string, data: any, noAuth?: boolean): Promise<any> => {
    console.log('📡 설문 제출 요청:', surveyId, data);
    const result = await apiRequest(`/api/v1/assessment/${surveyId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, noAuth);
    console.log('📥 설문 제출 결과:', result);
    return result;
  },

  getSurveyScores: async (surveyId: string): Promise<any> => {
    console.log('📡 설문 점수 조회 요청:', surveyId);
    const result = await apiRequest(`/api/v1/assessment/${surveyId}/scores`);
    console.log('📥 설문 점수 조회 결과:', result);
    return result;
  },

  // 새로운 리포트 관련 메서드 추가
  getAllReports: async (): Promise<ReportSummary[]> => {
    console.log('📡 전체 리포트 조회 요청');
    const result = await apiRequest<ReportSummary[]>('/api/v1/reports/');
    console.log('📥 전체 리포트 조회 결과:', result);
    return result;
  },

  getWorkspaceReport: async (workspaceId: string): Promise<WorkspaceReport> => {
    console.log('📡 워크스페이스 리포트 조회 요청:', workspaceId);
    const result = await apiRequest<WorkspaceReport>(`/api/v1/reports/workspace/${workspaceId}`);
    console.log('📥 워크스페이스 리포트 조회 결과:', result);
    return result;
  }
};

// 대시보드 관련 API
export const dashboardAPI = {
  getOverview: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/overview');
  },
  
  getStats: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/stats');
  },

  getDailyAnalytics: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/analytics/daily');
  },

  getCompetencyAnalytics: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/analytics/competencies');
  },

  getDemographics: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/analytics/demographics');
  },

  getRealtimeStats: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/realtime/today');
  },

  getCompletionRates: async (): Promise<any> => {
    return apiRequest('/api/v1/dashboard/analytics/completion');
  },

  getRecentResponses: async (limit: number = 10): Promise<any> => {
    try {
      const response = await apiRequest(`/api/v1/dashboard/responses/recent?limit=${limit}`);
      console.log('✅ 최근 응답 데이터 로드 성공:', response);
      return response;
    } catch (error) {
      console.error('❌ 최근 응답 데이터 로드 실패:', error);
      throw error;
    }
  },

  // 새로운 대시보드 API 메서드들
  getSubmissionOverview: async (workspaceId?: string): Promise<any> => {
    const url = workspaceId 
      ? `/api/v1/dashboard/submissions/overview?workspace_id=${workspaceId}`
      : '/api/v1/dashboard/submissions/overview';
    return apiRequest(url);
  },

  getSubmissionTrend: async (workspaceId?: string): Promise<any> => {
    const url = workspaceId 
      ? `/api/v1/dashboard/submissions/trend?workspace_id=${workspaceId}`
      : '/api/v1/dashboard/submissions/trend';
    return apiRequest(url);
  },

  getDailySubmissions: async (workspaceId?: string, days: number = 30): Promise<any> => {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (days !== 30) params.append('days', days.toString());
    
    const url = `/api/v1/dashboard/submissions/daily${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest(url);
  },

  getWorkspaceRecentResponses: async (workspaceId?: string, limit: number = 5): Promise<any> => {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (limit !== 5) params.append('limit', limit.toString());
    
    const url = `/api/v1/dashboard/submissions/recent${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest(url);
  }
};

// 리포트 관련 API
export const reportAPI = {
  getAll: async (): Promise<ReportSummary[]> => {
    console.log('📡 전체 리포트 조회 요청');
    const result = await apiRequest<ReportSummary[]>('/api/v1/reports/');
    console.log('📥 전체 리포트 조회 결과:', result);
    return result;
  },
  
  getByWorkspace: async (workspaceId: string): Promise<WorkspaceReport> => {
    console.log('📡 워크스페이스 리포트 조회 요청:', workspaceId);
    const result = await apiRequest<WorkspaceReport>(`/api/v1/reports/${workspaceId}`);
    console.log('📥 워크스페이스 리포트 조회 결과:', result);
    return result;
  },

  // 새로운 Reports API들
  getWorkspaces: async (): Promise<{ workspaces: string[]; total_count: number }> => {
    console.log('📡 리포트 워크스페이스 목록 조회 요청');
    const result = await apiRequest<{ workspaces: string[]; total_count: number }>('/api/v1/reports/workspaces');
    console.log('📥 리포트 워크스페이스 목록 조회 결과:', result);
    return result;
  },

  getSurveysByWorkspace: async (workspaceName: string): Promise<{
    workspace_name: string;
    surveys: Array<{
      survey_name: string;
      original_results_count: number;
      ai_results_count: number;
      total_students: number;
    }>;
    total_surveys: number;
  }> => {
    console.log('📡 워크스페이스별 설문 목록 조회 요청:', workspaceName);
    const encodedName = encodeURIComponent(workspaceName);
    const result = await apiRequest<{
      workspace_name: string;
      surveys: Array<{
        survey_name: string;
        original_results_count: number;
        ai_results_count: number;
        total_students: number;
      }>;
      total_surveys: number;
    }>(`/api/v1/reports/workspaces/${encodedName}/surveys`);
    console.log('📥 워크스페이스별 설문 목록 조회 결과:', result);
    return result;
  },

  getAIResults: async (workspaceName: string, surveyName: string): Promise<{
    workspace_name: string;
    survey_name: string;
    ai_results: Array<{
      student_name: string;
      file_key: string;
      size: number;
      last_modified: string;
      download_url: string;
    }>;
    total_count: number;
  }> => {
    console.log('📡 AI 분석 결과 조회 요청:', { workspaceName, surveyName });
    const encodedWorkspace = encodeURIComponent(workspaceName);
    const encodedSurvey = encodeURIComponent(surveyName);
    const result = await apiRequest<{
      workspace_name: string;
      survey_name: string;
      ai_results: Array<{
        student_name: string;
        file_key: string;
        size: number;
        last_modified: string;
        download_url: string;
      }>;
      total_count: number;
    }>(`/api/v1/reports/workspaces/${encodedWorkspace}/surveys/${encodedSurvey}/ai`);
    console.log('📥 AI 분석 결과 조회 결과:', result);
    return result;
  },

  // AI 결과 파일 내용 다운로드 (JSON 파싱)
  downloadAIResult: async (downloadUrl: string): Promise<any> => {
    console.log('📡 AI 결과 파일 다운로드 요청:', downloadUrl);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`AI 결과 다운로드 실패: ${response.status}`);
    }
    const result = await response.json();
    console.log('📥 AI 결과 파일 다운로드 완료');
    return result;
  }
};

// 파일 관련 API
export const fileAPI = {
  uploadExcel: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest('/api/v1/files/upload/excel', {
      method: 'POST',
      body: formData,
      headers: {}, // FormData의 경우 Content-Type을 자동으로 설정
    });
  },
  
  downloadTemplate: async (): Promise<Blob> => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/files/template/excel`);
    
    if (!response.ok) {
      throw new Error(`템플릿 다운로드 실패: ${response.status}`);
    }
    
    return response.blob();
  },
};

// 헬스 체크 API
export const healthAPI = {
  check: async (): Promise<any> => {
    return apiRequest('/health');
  },
  
  root: async (): Promise<any> => {
    return apiRequest('/');
  },
};

// API 연결 테스트
export const testConnection = async (): Promise<{ status: string; message: string }> => {
  try {
    await healthAPI.check();
    return { status: 'success', message: '백엔드 연결 성공' };
  } catch (error) {
    throw new Error('백엔드 서버에 연결할 수 없습니다.');
  }
}; 