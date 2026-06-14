#!/bin/bash

# 1. 빌드 스크립트 실행
echo "🔄 빌드 중: python3 build_single_file.py..."
python3 build_single_file.py

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패! 스크립트를 확인해 주세요."
    exit 1
fi

# 2. 결과물을 docs/index.html로 복사
echo "📁 docs/index.html로 복사 중..."
mkdir -p docs
cp ear_trainer_standalone.html docs/index.html

# 3. Git 작업 수행
echo "📤 GitHub에 업데이트 푸시 중..."
git add -A

# 커밋 메시지가 인자로 주어졌으면 사용하고, 없으면 기본 메시지 사용
COMMIT_MSG=${1:-"Update app version"}
git commit -m "$COMMIT_MSG"

git push

if [ $? -eq 0 ]; then
    echo "✅ 업데이트 및 푸시가 완료되었습니다!"
    echo "🌐 GitHub Actions 배포가 끝난 후 페이지를 새로고침 해보세요."
else
    echo "❌ 푸시 실패! GitHub 인증 상태나 터미널의 Git 설정을 확인해 주세요."
fi
