# 2026 MIDAS WEEK Photo Gallery

사내 단체사진 공유 정적 사이트. Figma 디자인 기반으로 제작.

## 구성
- `index.html`, `styles.css`, `app.js` — 사이트 (프레임워크 없는 순수 정적)
- `manifest.json` — 그룹/사업부/사진 목록 데이터
- `images/thumbs/` — 카드 썸네일 (경량)
- `images/full/` — 라이트박스 표시 + 다운로드용 고화질 최적화본 (긴 변 2560px)
- `images/polaroids/` — 상단 슬라이딩 폴라로이드

## 기능
- 상단: 폴라로이드 사진이 오른쪽→왼쪽으로 무한 슬라이딩
- 하단: 그룹별 섹션 + 폴더 모양 사업부 버튼
- 사업부 클릭 → 단체사진 카드 목록, 이미지 클릭 시 라이트박스(좌우 이동)
- Download 버튼 → 고화질 사진 저장

## 배포 (GitHub Pages)
```bash
bash deploy.sh <GITHUB_TOKEN>
```
배포 주소: https://bananapallete.github.io/2026-midas-week-photo-gallery/

## 사진 재생성
원본에서 최적화본을 다시 만들려면 (경로는 build.js 상단 SRC 참고):
```bash
node build.js
```
