# 초기 세팅 체크리스트

이 체크리스트는 실제 봇 기능 구현 전에 GitHub, Discord Developer Portal, Antigravity 연결을 빠르게 끝내기 위한 문서입니다.

## 현재 완료된 로컬 세팅

| 항목 | 상태 | 설명 |
| --- | --- | --- |
| 프로젝트 폴더 | 완료 | `/home/ubuntu/roblox-vending-discord-bot`에 생성되었습니다. |
| Git 저장소 | 완료 | 로컬 저장소가 초기화되었습니다. |
| Node.js 패키지 설정 | 완료 | `package.json`이 생성되었습니다. |
| AI 협업 지침 | 완료 | `CLAUDE.md`가 생성되었습니다. |
| 환경 변수 예시 | 완료 | `.env.example`이 생성되었습니다. |
| Antigravity 지시문 | 완료 | `docs/ANTIGRAVITY_PROMPT.md`가 생성되었습니다. |
| GitHub Actions 초안 | 완료 예정 | `.github/workflows/ci.yml`과 배포 준비 파일을 생성합니다. |

## 사용자에게 필요한 정보

다음 정보가 있으면 GitHub 원격 저장소 생성, Discord 앱 생성, Antigravity 연결까지 이어서 진행할 수 있습니다.

| 구분 | 필요한 정보 | 사용 목적 |
| --- | --- | --- |
| GitHub | GitHub 로그인 가능 상태 또는 저장소 URL | 로컬 세팅 파일을 원격 저장소에 푸시합니다. |
| GitHub | 저장소 이름 | 기본값은 `roblox-vending-discord-bot`입니다. |
| Discord | Developer Portal 로그인 가능 상태 | 봇 애플리케이션을 생성하거나 기존 앱을 확인합니다. |
| Discord | 봇 이름 | Discord 애플리케이션과 봇 표시 이름에 사용합니다. |
| Discord | 초대할 서버 | OAuth2 초대 링크로 봇을 서버에 추가합니다. |
| Antigravity | Google 계정 로그인 가능 상태 | GitHub 저장소와 개발 환경을 연결합니다. |
| 배포 | 24시간 실행 위치 선택 | Antigravity/클라우드/VPS 중 하나를 나중에 확정합니다. |

## 진행 순서

먼저 GitHub 저장소를 준비하고, 로컬 세팅 파일을 첫 커밋으로 푸시합니다. 그 다음 Discord Developer Portal에서 애플리케이션을 만들고 `CLIENT_ID`와 봇 토큰을 확인합니다. 이후 Antigravity에서 GitHub 저장소를 연결하고 `docs/ANTIGRAVITY_PROMPT.md`를 첫 지시문으로 사용합니다.

| 단계 | 작업 | 결과물 |
| --- | --- | --- |
| 1 | GitHub 저장소 생성 또는 기존 저장소 URL 확인 | 원격 저장소 주소 |
| 2 | 로컬 파일 커밋 및 푸시 | GitHub에 초기 세팅 반영 |
| 3 | Discord Developer Portal 접속 | 앱 및 봇 생성 화면 확인 |
| 4 | Discord 앱 정보 `.env`에 반영 | 로컬 실행 준비 |
| 5 | Antigravity에 저장소 연결 | AI 개발 환경 연결 |
| 6 | 배포 대상 확정 | 24시간 실행 준비 |

## 24시간 실행 선택지

현재 단계에서는 확정하지 않고, 다음 선택지 중 하나로 이어갈 수 있게 파일 구조만 준비합니다.

| 방식 | 장점 | 부담 | 적합한 경우 |
| --- | --- | --- | --- |
| Antigravity와 클라우드 배포 | GitHub와 자동화 연결이 편합니다. | 클라우드 계정 설정이 필요합니다. | Antigravity 중심으로 개발할 때 적합합니다. |
| 독립 서버 상시 실행 | 봇 프로세스를 계속 켜두기 쉽습니다. | 서버 비용과 운영 설정이 필요합니다. | Discord 봇, 웹훅, 자동화가 모두 필요한 경우 적합합니다. |
| 개인 PC 실행 | 추가 서버 비용이 없습니다. | PC가 항상 켜져 있어야 합니다. | 테스트나 임시 운영에 적합합니다. |

## 다음 입력 요청

아래 네 가지 중 가능한 것부터 알려주면 이어서 직접 연결 작업을 진행합니다.

| 우선순위 | 요청 정보 |
| --- | --- |
| 1 | GitHub 저장소를 새로 만들지, 기존 저장소를 쓸지 알려주세요. |
| 2 | 사용할 GitHub 저장소 URL 또는 GitHub 계정명을 알려주세요. |
| 3 | Discord Developer Portal 로그인이 필요한 시점에 브라우저에서 직접 로그인할 수 있는지 알려주세요. |
| 4 | 봇 이름을 알려주세요. 기본값은 `Roblox Vending Bot`으로 두겠습니다. |
