# AI 역량평가 결과 Export Lambda 함수

## 개요
학생들의 AI 역량평가 결과를 Excel 파일로 export하는 AWS Lambda 함수입니다.

## 기능
- 워크스페이스별 설문 응답 데이터 조회
- Excel 파일 생성 (다중 시트)
  - 개요: 워크스페이스 정보 및 기본 통계
  - 응답자 정보: 개인정보 및 응답 현황
  - 설문 응답: 문항별 응답 데이터
  - 통계 분석: 소속별, 학력별 통계
- S3에 파일 업로드 및 다운로드 URL 생성

## 환경 변수
- `S3_BUCKET_NAME`: Excel 파일을 저장할 S3 버킷명
- `RESULTS_TABLE_NAME`: 설문 응답 데이터가 저장된 DynamoDB 테이블명
- `WORKSPACES_TABLE_NAME`: 워크스페이스 정보가 저장된 DynamoDB 테이블명

## 런타임
- Python 3.13
- 메모리: 512MB (권장)
- 타임아웃: 5분 (권장)

## 배포 방법

### 1. 의존성 설치
```bash
pip install -r requirements.txt -t .
```

### 2. ZIP 파일 생성
```bash
zip -r export-results.zip .
```

### 3. Lambda 함수 생성/업데이트
```bash
aws lambda create-function \
  --function-name ai-assessment-export-results \
  --runtime python3.13 \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://export-results.zip \
  --timeout 300 \
  --memory-size 512
```

## IAM 권한
Lambda 실행 역할에 다음 권한이 필요합니다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/YOUR_RESULTS_TABLE",
        "arn:aws:dynamodb:*:*:table/YOUR_WORKSPACES_TABLE"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/*"
    }
  ]
}
```

## 요청 형식
```json
{
  "workspace_id": "workspace-uuid"
}
```

## 응답 형식
### 성공
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "message": "Export 완료",
    "download_url": "https://s3.amazonaws.com/...",
    "s3_key": "exports/workspace-id/20240115_103000.xlsx",
    "workspace_name": "2024년 1학기 AI 역량평가",
    "total_responses": 150
  }
}
```

### 오류
```json
{
  "statusCode": 400,
  "body": {
    "error": "workspace_id is required",
    "message": "워크스페이스 ID가 필요합니다."
  }
}
```

## 테스트
```bash
# 로컬 테스트용 이벤트
{
  "workspace_id": "test-workspace-id"
}
```