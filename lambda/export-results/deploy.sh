#!/bin/bash

# AI 역량평가 결과 Export Lambda 함수 배포 스크립트

set -e

FUNCTION_NAME="ai-assessment-export-results"
REGION="ap-northeast-2"  # 서울 리전
RUNTIME="python3.13"
HANDLER="lambda_function.lambda_handler"
TIMEOUT=300
MEMORY_SIZE=1024  # pandas 때문에 메모리 증가

echo "🚀 Lambda 함수 배포 시작: $FUNCTION_NAME"

# 1. 기존 패키지 정리
echo "📦 기존 패키지 정리..."
rm -rf package/
rm -f export-results.zip

# 2. 의존성 설치
echo "📥 의존성 설치..."
mkdir -p package

# Python 3.13용 pandas 설치 (Lambda 환경에 맞게)
pip install --platform manylinux2014_x86_64 --target=package --implementation cp --python-version 3.13 --only-binary=:all: --upgrade pandas==2.1.4
pip install --platform manylinux2014_x86_64 --target=package --implementation cp --python-version 3.13 --only-binary=:all: --upgrade openpyxl==3.1.2
pip install --platform manylinux2014_x86_64 --target=package --implementation cp --python-version 3.13 --only-binary=:all: --upgrade xlsxwriter==3.1.9
pip install --platform manylinux2014_x86_64 --target=package --implementation cp --python-version 3.13 --only-binary=:all: --upgrade boto3

# 3. 소스 코드 복사
echo "📄 소스 코드 복사..."
cp lambda_function.py package/

# 4. ZIP 파일 생성
echo "🗜️  ZIP 파일 생성..."
cd package
zip -r ../export-results.zip .
cd ..

# 5. 파일 크기 확인
echo "📏 ZIP 파일 크기 확인..."
ls -lh export-results.zip

# 6. Lambda 함수 업데이트
echo "🔄 Lambda 함수 코드 업데이트..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://export-results.zip \
    --region $REGION

echo "⚙️  함수 설정 업데이트..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --handler $HANDLER \
    --timeout $TIMEOUT \
    --memory-size $MEMORY_SIZE \
    --environment Variables='{"S3_BUCKET_NAME":"competency-surveys"}' \
    --region $REGION

# 7. 정리
echo "🧹 임시 파일 정리..."
rm -rf package/
rm -f export-results.zip

echo "✅ 배포 완료!"
echo ""
echo "다음 단계:"
echo "1. 람다 함수 테스트 실행"
echo "2. CloudWatch 로그 확인"
echo "3. 프론트엔드에서 테스트"