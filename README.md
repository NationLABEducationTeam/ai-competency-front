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

### 컴포넌트 작성 규칙
- 함수형 컴포넌트 사용
- TypeScript 타입 정의 필수
- Material-UI sx prop 활용
- 반응형 디자인 고려

### 상태 관리
- Zustand를 사용한 전역 상태 관리
- 페이지별 로컬 상태는 useState 활용

### 스타일링
- Material-UI의 sx prop 우선 사용
- 일관된 색상 팔레트 적용
- 그라데이션 및 그림자 효과 활용

## 🔮 향후 계획

- [ ] 차트 라이브러리 연동 (Chart.js/Recharts)
- [ ] 백엔드 API 연동
- [ ] AWS 서비스 통합
- [ ] PDF 생성 기능 구현
- [ ] 엑셀 업로드 기능
- [ ] 실시간 알림 시스템
- [ ] 다국어 지원

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
