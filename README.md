# AI 역량 평가 시스템 (Frontend)

React와 TypeScript로 구축된 AI 역량 평가 시스템의 프론트엔드 애플리케이션입니다.

## 🚀 주요 기능

### 관리자 기능
- **대시보드**: 전체 통계 및 현황 모니터링
- **워크스페이스 관리**: 프로젝트 단위별 워크스페이스 생성 및 관리
- **설문 생성**: AI 역량 평가 설문 생성 및 관리 (최대 100문항)
- **리포트 관리**: 학생별 평가 결과 조회 및 PDF 다운로드

### 학생 기능
- **개인정보 입력**: 이름, 소속, 나이, 이메일, 학력, 학과 정보 입력
- **설문 응답**: 5문항씩 단계별 설문 진행
- **진행률 표시**: 실시간 설문 진행 상황 확인

## 🛠 기술 스택

- **Frontend**: React 18, TypeScript
- **상태관리**: Zustand
- **UI 라이브러리**: Material-UI (MUI)
- **라우팅**: React Router DOM
- **폰트**: Pretendard, Noto Sans KR
- **빌드 도구**: Create React App

## 📁 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   └── Layout/         # 레이아웃 컴포넌트
├── pages/              # 페이지 컴포넌트
│   ├── Login.tsx       # 로그인 페이지
│   ├── Dashboard.tsx   # 대시보드
│   ├── Workspaces.tsx  # 워크스페이스 목록
│   ├── WorkspaceDetail.tsx # 워크스페이스 상세
│   ├── Reports.tsx     # 리포트 관리
│   └── SurveyForm.tsx  # 학생용 설문 페이지
├── store/              # Zustand 상태 관리
│   ├── authStore.ts    # 인증 상태
│   └── workspaceStore.ts # 워크스페이스 상태
├── types/              # TypeScript 타입 정의
└── services/           # API 서비스 (예정)
```

## 🎨 디자인 시스템

- **컬러 팔레트**: 
  - Primary: #667eea (보라-파랑 그라데이션)
  - Secondary: #764ba2
  - Background: #f5f5f7
- **타이포그래피**: Pretendard, Noto Sans KR
- **컴포넌트**: Material-UI 기반 커스텀 디자인

## 🚀 시작하기

### 필수 요구사항
- Node.js 16.0.0 이상
- npm 또는 yarn

### 설치 및 실행

1. 의존성 설치
```bash
npm install
```

2. 개발 서버 실행
```bash
npm start
```

3. 브라우저에서 `http://localhost:3000` 접속

### 빌드

```bash
npm run build
```

## 📋 주요 페이지

### 1. 로그인 페이지 (`/login`)
- 관리자 로그인 인터페이스
- 그라데이션 배경과 글래스모피즘 디자인

### 2. 대시보드 (`/dashboard`)
- 전체 워크스페이스, 설문, 응답자 통계
- 월별 응답 추이 차트 (예정)
- 최근 활동 피드

### 3. 워크스페이스 (`/workspaces`)
- 워크스페이스 목록 카드 뷰
- 새 워크스페이스 생성 기능
- 각 워크스페이스별 통계 표시

### 4. 워크스페이스 상세 (`/workspaces/:id`)
- 설문 목록 관리
- Add Question 기능으로 새 설문 생성
- 설문별 링크 생성 및 복사

### 5. 리포트 (`/reports`)
- 학생별 응답 결과 테이블
- 검색 및 필터링 기능
- 개별/일괄 PDF 다운로드

### 6. 설문 페이지 (`/survey/:id`)
- 학생용 설문 응답 인터페이스
- 개인정보 입력 단계
- 5문항씩 단계별 진행
- 진행률 표시 및 스테퍼

## 🔧 환경 설정

### AWS 연동 (예정)
- **RDS**: 사용자 정보 저장
- **S3**: 설문 데이터 및 리포트 저장
- **Bedrock**: AI 기반 평가 및 리포트 생성

### 데이터베이스 연결 정보
```javascript
// RDS 연결 정보 (백엔드)
const connection = {
  host: "competency-db.cjik2cuykhtl.ap-northeast-2.rds.amazonaws.com",
  user: "admin",
  password: "dkanrjsk1!A",
  database: "competency"
}
```

## 📝 개발 가이드라인

### API 연동 및 데이터 처리
- **API 요청**: `src/services/apiService.ts`에 정의된 함수를 통해 API를 요청합니다.
- **타입 동기화**: `src/types/index.ts`에 정의된 타입은 백엔드 API의 응답 스키마와 항상 동기화되어야 합니다. 타입 불일치로 인한 오류(예: `workspace.name` 대신 `workspace.title` 사용)를 방지하기 위해, 백엔드 변경 시 프론트엔드 타입도 함께 수정해야 합니다.

### 상태 관리
- **Zustand (전역 상태)**: 여러 페이지나 컴포넌트에서 공유되는 데이터(예: 사용자 인증 정보, 전체 워크스페이스 목록)를 관리합니다.
- **useState (지역 상태)**: 단일 컴포넌트 내에서만 사용되는 상태(예: 모달의 열림/닫힘 상태, 입력 폼 데이터)를 관리합니다.
- **데이터 Fetching**: 전역 상태로 관리되는 데이터는 필요 시점에 한 번만 호출하고, UI 상태 변경에 따라 필터링/정렬하는 것을 권장합니다.

### 컴포넌트 작성 규칙
- **함수형 컴포넌트**와 **React Hooks**를 사용합니다.
- 모든 컴포넌트와 props에 **TypeScript 타입**을 명확하게 정의합니다.
- **반응형 디자인**을 고려하여 `sx` prop 내에 미디어 쿼리를 적극 활용합니다.

### 스타일링
- **`sx` prop 우선 사용**: 컴포넌트의 동적 스타일링 및 간단한 스타일 수정은 `sx` prop을 우선적으로 사용합니다.
- **`styled` API**: 재사용성이 높고 복잡한 스타일을 가진 커스텀 컴포넌트를 만들 경우 `styled` API를 사용합니다.
- **테마 활용**: `src/theme.ts`에 정의된 색상, 타이포그래피, 간격 등 테마 값을 일관되게 사용합니다.

### 의존성 관리
- **핵심 라이브러리 버전 고정**: 이 프로젝트는 **React 18**과 **Material-UI (MUI) v5**를 기준으로 안정화되었습니다. `package.json`에서 다음 버전 범위를 유지하는 것을 권장합니다.
  - `"react": "^18.0.0"`
  - `"@mui/material": "^5.15.0"`
- **버전 충돌 주의**: 과거 **React 19**와 **MUI v5** 간의 심각한 호환성 충돌로 인해 대규모 리팩토링이 필요했습니다. 새로운 라이브러리를 추가하거나 기존 라이브러리를 업데이트할 때, 위 명시된 핵심 라이브러리와의 호환성을 반드시 확인해야 합니다.
- **타입 정의 패키지 동기화**: `typescript`, `@types/react`, `@types/react-dom` 등의 타입 관련 패키지는 실제 라이브러리 버전과 호환되는 버전을 사용해야 합니다. 버전이 맞지 않으면 예상치 못한 타입 에러가 발생할 수 있습니다.
- **정기적인 검토**: `npm outdated` 명령어를 통해 오래된 패키지를 정기적으로 확인하되, 업데이트는 반드시 호환성을 검토한 후 신중하게 진행합니다.

## 🔮 향후 계획

- [] 이메일 자동 송부 기능 (aws serverless lambda)
- [] 리포트 비교 기능 

