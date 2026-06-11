# Roblox Vending Discord Bot

이 저장소는 로블록스 아이템 및 로벅스 판매용 Discord 자판기 봇 개발을 시작하기 위한 **초기 세팅 저장소**입니다. 현재 단계에서는 실제 판매, 지급, 자동 충전, 랜덤박스 로직을 구현하지 않고, GitHub·Claude Code·Google Antigravity·Discord Developer Portal 연결을 빠르게 진행할 수 있는 기반만 준비합니다.

## 현재 포함된 항목

| 파일 | 목적 |
| --- | --- |
| `CLAUDE.md` | Claude Code와 다른 AI 코딩 도구가 참고할 개발 규칙입니다. |
| `docs/ANTIGRAVITY_PROMPT.md` | Antigravity에 붙여 넣을 초기 지시문입니다. |
| `docs/SETUP_CHECKLIST.md` | GitHub, Discord, Antigravity 연결 순서 체크리스트입니다. |
| `.env.example` | 이후 필요한 환경 변수 이름을 정리한 파일입니다. |
| `.github/workflows/ci.yml` | GitHub에서 기본 검사를 수행하는 워크플로우 초안입니다. |
| `Dockerfile` | 추후 24시간 실행 환경으로 배포할 때 사용할 컨테이너 초안입니다. |

## 빠른 시작

로컬에서 기본 상태만 확인하려면 아래 명령을 실행합니다.

```bash
npm install
npm run dev
```

환경 변수가 아직 없어도 현재 스텁은 정상적으로 안내 메시지를 출력하고 종료됩니다. 실제 Discord 로그인과 기능 구현은 다음 단계에서 추가합니다.

## 개발 도구 연결 순서

| 순서 | 작업 | 문서 |
| --- | --- | --- |
| 1 | GitHub 저장소 생성 및 첫 커밋 푸시 | `docs/SETUP_CHECKLIST.md` |
| 2 | Discord Developer Portal에서 앱과 봇 생성 | `docs/SETUP_CHECKLIST.md` |
| 3 | Antigravity에 GitHub 저장소 연결 | `docs/ANTIGRAVITY_PROMPT.md` |
| 4 | Claude Code 또는 Antigravity로 기능 단위 개발 시작 | `CLAUDE.md` |

## 현재 구현하지 않은 항목

아래 항목은 추후 상세 요구사항을 확정한 뒤 구현합니다.

| 항목 | 상태 |
| --- | --- |
| 재고 관리 명령어 | 미구현 |
| 자동 충전 처리 | 미구현 |
| 랜덤박스 기능 | 미구현 |
| 로블록스 아이템 지급 연동 | 미구현 |
| 운영자 대시보드 | 미구현 |

## 다음 단계

다음 단계에서는 GitHub 원격 저장소를 연결하고, Discord Developer Portal에서 애플리케이션을 만든 뒤, Antigravity가 이 저장소를 인식하도록 연결합니다. 사용자가 GitHub 계정 또는 저장소 URL, Discord 로그인 가능 여부, 봇 이름을 제공하면 이어서 진행할 수 있습니다.
