# Auralis Ear Training

## 빌드 & 배포 규칙 (필독)

**GitHub Pages는 `docs/index.html` (번들 파일)을 서빙한다.**
소스 파일(`js/`, `css/`)을 수정한 뒤 반드시 빌드를 실행해야 변경이 반영된다.

```bash
# 소스 수정 후 항상 이 순서로:
python3 build_single_file.py          # 번들 생성
cp ear_trainer_standalone.html docs/index.html  # 배포 파일 갱신
git add ...                           # 커밋 및 푸시
```

또는 커밋 메시지와 함께 한 번에:
```bash
bash deploy.sh "커밋 메시지"
```

**소스만 push하면 GitHub Pages에 반영되지 않는다.**
