# 한전 과제 적용 준비 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/applied-support/kepco.html

TECHNICAL REPORT

# 한전 과제 적용 준비

Indy12 두 대의 소유권·session·수집·검사·학습 준비를 연결한 내부 운영 매뉴얼.

DocumentationMulti-Robot

MY ROLE
다중 로봇 운영 절차 작성 · 상태·데이터 점검 · 과제 적용 준비

DOCUMENT
Technical Report

Indy12 두 대의 MiMicX 운영을 위해 설정·수집·저장·검사·Replay·학습 준비를 연결한 내부 매뉴얼을 작성했습니다. 각 단계의 상태와 소유권, 다음 단계에서 확인할 조건을 함께 설명합니다.

## 1. 운영 대상과 설정의 범위

### 1.1 두 대의 독립 로봇을 위한 내부 운영 매뉴얼

한전 활선 과제 적용을 준비하며 Indy12 두 대를 MiMicX에서 설정·조작·수집·검사하는 사용법을 작성했습니다. 다중 로봇 기능을 적용한 뒤 구성원이 장비 상태를 구분해 사용할 수 있도록, 화면의 설정 위치와 정상·오류 관찰을 함께 정리한 내부 운영 문서입니다.

작성 범위는 뉴로메카 내부에서 구성원이 독립 로봇 두 대의 상태와 기록을 해석할 수 있도록 준비한 운영·인수인계 절차입니다.

[그림: Neuromeka Indy12 협동로봇 제품 이미지]

Indy12 · 독립 단일 팔 로봇
각 로봇이 자신의 제어기·상태·엔드이펙터를 갖는 구성을 설명하기 위한 공식 제품 이미지입니다. 두 대의 실제 설치 사진은 아닙니다.

Neuromeka · 공식 Indy12 제품 이미지

[그림: VIVE Controller의 트랙패드와 트리거]

VIVE Controller
추적 pose·버튼과 로봇 binding·calibration을 함께 다룬 입력 장치의 제품군 참고 사진입니다.

HTC VIVE · 공식 제품 이미지

### 1.2 Session은 소유권과 순서를 가진 로봇 집합

[그림: 매뉴얼과 다중 로봇 구조를 바탕으로 작성한 역할도. 선택 로봇은 개별 조작의 대상이고, session은 수집·Replay·학습이 공유할 participant와 순서를 정합니다.]

매뉴얼과 다중 로봇 구조를 바탕으로 작성한 역할도. 선택 로봇은 개별 조작의 대상이고, session은 수집·Replay·학습이 공유할 participant와 순서를 정합니다. 크게 보기 ↗

Indy12 두 대는 양팔 로봇 한 대의 left/right가 아니라 별개의 단일 팔 로봇입니다. 각 로봇을 등록한 다음 Session Setup에서 두 participant를 선택하고 Stable Order를 정했습니다. 그리퍼나 로봇손은 장치 등록 시 owner robot을 명시해 연결했습니다.

runtime의 robot_id는 실제 조작 대상을, 저장용 robot_key는 데이터 소유자를 나타냅니다. robot_order는 이 소유자들을 일관된 순서로 처리하는 기준이며 물리적 왼쪽·오른쪽을 추측하는 용도로 쓰지 않았습니다. 이 계약은 이후 robot-keyed 관측·행동과 Replay 명령 라우팅까지 이어집니다.

독립 다중 로봇 지원 — 확장 구조와 구현 →

### 1.3 등록 상태·현재 선택·저장 자세를 구분

설정 화면에서 서로 다른 범위
| 항목 | 정하는 것 | 확인할 관찰

| Robot 등록 | 접속할 실제 로봇 | 전원·오류·응답과 등록 표시

| Session Participants | 함께 기록·실행할 로봇 집합 | 두 로봇이 참여하는가

| Stable Order | 데이터와 후속 처리의 순서 | 저장된 order와 현재 구성이 같은가

| Move Robot 선택 | 지금 수동 조작할 한 로봇 | 다른 participant를 대신 움직이지 않는가

| Saved Position | 해당 로봇의 저장 자세 | 선택한 robot의 자세인가

| EE owner | 그리퍼·로봇손의 소속 | 팔 명령과 EE 명령의 대상이 같은가

등록 카드가 보인다는 이유만으로 세션 준비가 끝난 것은 아니었습니다. Move Robot에서는 한 로봇을 선택해 조작하더라도, 수집의 대상은 session 전체입니다. 저장 자세도 로봇별로 관리해 같은 이름의 위치가 다른 로봇에 적용되지 않도록 구분했습니다.

### 1.4 입력 장치의 발견·연결·binding·calibration

Vive는 SteamVR과 추적 장치가 준비된 뒤 로봇과 해당 controller를 선택해 calibration하는 순서로 안내했습니다. controller가 추적되더라도 어느 로봇의 팔에 연결됐는지와 기준 좌표가 맞는지는 별도로 확인해야 합니다.

장치별 실행 전제
| 장치 | 실행 경로 | 운영 확인점

| Vive | Host SteamVR 추적·입력 → MiMicX | 추적 유효성·controller 선택·robot binding·calibration

| Quest / Pico | WiVRn 연결과 OpenXR 세션 → 입력 | 연결·focus·유효 pose·기준 좌표

| SpaceMouse | USB HID → backend 입력 | 장치 발견·권한·실제 axis/button 변화

| 카메라 | 선택 장치·profile → 영상 stream | 등록 목록과 실제 프레임·필수 입력 여부

매뉴얼에 적었던 특정 USB 포트 안내는 당시 구성의 운영 메모로 다룹니다. SpaceMouse는 고대역 영상 장치가 아니라 HID 입력이므로 USB 3.0 자체를 공통 필수 조건으로 일반화하지 않고, 장치 노출·권한·sample 변화부터 확인하도록 설명을 보완했습니다.

장치별 동작 원리 — 입력 생성과 기준 좌표 →

## 2. 수집과 저장·검사

### 2.1 Task와 Capture Plan을 확정한 뒤 기록

Data Collect에서 task 이름을 정해 Use Task로 선택하고, Current Capture Plan을 새로고침한 뒤 검토·저장하도록 구성했습니다. Task는 기록의 작업 맥락이고 Capture Plan은 어떤 robot·EE·camera stream을 한 episode에 저장할지 정하는 계약입니다.

plan의 로봇 집합과 현재 session, 각 EE owner가 맞는지 먼저 보아야 합니다. 두 로봇의 snapshot을 같은 capture tick에서 읽어 한 timeline으로 저장하더라도, 이것이 물리 동작의 동시성이나 정량 동기 오차를 자동으로 보증하는 것은 아닙니다. 공유된 표본 축과 실제 장비 응답을 구분했습니다.

### 2.2 두 participant의 mode와 Recording 상태는 별개

[그림: 로봇 제어 mode와 기록 lifecycle을 나누어 그렸습니다. TeleT/Idle은 participant의 제어 상태이고, on/paused/stop은 기록 상태이며, Save/Reject는 episode 채택 단계입니다.]

로봇 제어 mode와 기록 lifecycle을 나누어 그렸습니다. TeleT/Idle은 participant의 제어 상태이고, on/paused/stop은 기록 상태이며, Save/Reject는 episode 채택 단계입니다. 크게 보기 ↗

TeleT 진입에서는 두 participant가 모두 조작 가능한 상태인지 확인하도록 했습니다. 한 대만 TeleT이고 다른 대가 Idle이면 세션 전체가 준비됐다고 볼 수 없습니다. TeleT에서 Idle로 돌아갈 때도 두 로봇 모두 복귀하는지 확인했습니다.

이 구분은 실제 개발 중 한 로봇만 mode가 바뀌던 문제를 찾는 기준이 됐습니다. 화면의 선택 robot에만 명령을 보내던 경계를 session 전체로 확장했고, 개별 조작과 세션 전체 전환을 구별해 문서에 반영했습니다.

### 2.3 Start·Pause·Stop과 Save·Reject의 차이

Start 후 Recording이 on인지 확인하고, Pause를 누르면 paused 상태에서 Resume로 이어갈 수 있게 안내했습니다. Stop은 녹화 종료입니다. 그 뒤 Save episode로 채택하거나 Reject로 버리는 단계가 따로 있으므로, 녹화를 멈춘 것과 학습에 쓸 자료를 저장한 것을 같은 완료로 보지 않았습니다.

필수 카메라가 연결 해제되면 기록이 강제로 중지되는 조건도 함께 설명했습니다. 중지 원인을 확인하지 않고 다시 Start하는 대신 장치·plan·실제 프레임을 점검하고, 어떤 episode가 저장됐는지 확인하는 흐름으로 연결했습니다.

### 2.4 Overview·Graph·Table·Integrity를 나누어 검사

저장 후 서로 다른 검사 화면
| 화면 | 확인할 대상 | 다음 판단

| Overview | 선택 task·episode·영상과 요약 | 방금 저장한 대상이 맞는가

| Graph | 로봇별 상태·명령·시간 변화 | 어느 owner의 어느 구간이 달라졌는가

| Table | 표본별 값과 소유자 grouping | 배열·key·시간 대응이 맞는가

| Integrity | 누락·유효성·데이터 상태 | 후속 처리 전에 원인을 볼 필요가 있는가

영상이 보이는 것과 모든 수치 stream이 정상인 것은 다릅니다. 로봇별 grouping과 실제 값을 확인하고, H5의 영상 참조가 가리키는 sidecar 파일도 함께 유지해야 합니다. H5만 옮기고 MP4를 빠뜨리면 로봇 데이터가 있어도 선택한 vision 입력은 준비되지 않을 수 있습니다.

### 2.5 초기 정렬을 거쳐 저장 동작을 재실행

선택 episode의 시작 자세와 현재 로봇 자세가 다르면 초기 위치로 정렬한 뒤 본 Replay가 시작되도록 안내했습니다. 두 로봇의 owner와 저장된 session을 기준으로 명령이 분배되는지, Pause·Resume·Stop이 실제 실행 상태와 연결되는지 구분했습니다.

Indy12 두 대에서 수정 후 Replay를 직접 다시 실행해 정상 동작을 확인한 결과를 운영 절차로 연결했습니다. 기록을 재실행한 검증과 학습 모델이 새 관측으로 행동을 생성하는 inference는 다른 단계입니다.

Robot Replay·안전 로직 — 초기 정렬과 실행 제어 →

## 3. 학습 준비와 인수인계

### 3.1 학습 데이터 선택·정리 규칙·readiness

[그림: 원본 episode와 sidecar를 보존하면서 선택·curation·전처리·IO를 학습 산출물에 연결하는 흐름입니다. 문서에 있는 설정 예시를 과제의 최종 학습 성적으로 바꾸지 않았습니다.]

원본 episode와 sidecar를 보존하면서 선택·curation·전처리·IO를 학습 산출물에 연결하는 흐름입니다. 문서에 있는 설정 예시를 과제의 최종 학습 성적으로 바꾸지 않았습니다. 크게 보기 ↗

Data Source에서 실제 학습할 episode를 선택하고, 필요하면 curation artifact로 제외·trim 등의 정리 규칙을 적용하도록 설명했습니다. raw H5를 덮어써 정리하는 것과 어떤 규칙을 적용했는지 남기는 것은 재현성에서 차이가 있습니다.

Training Readiness는 선택한 입력·데이터·정리 규칙으로 학습이 가능한지를 검사합니다. usable episode/sample 수, 선택 camera와 순서, action key와 mode 등을 확인해야 합니다. 매뉴얼 화면의 sample 수는 그 선택 상태의 예시이지 과제 전체 데이터 양이나 최종 성능을 뜻하지 않습니다.

### 3.2 Trim·보조 label·relative action·crop

전처리 선택의 의미와 확인점
| 설정 | 바뀌는 것 | 검토할 조건

| Trim | episode 시작부의 학습 구간 | teleop 시작 판단과 실제 유효 명령, 수동 trim 수

| Progress / Success | 진행도 또는 종료 구간의 보조 target | 실제 성공 판정과 보조 label을 구별

| Relative delta / Absolute | pose action의 표현 | 현재 pose·좌표·단위와 decoder의 대응

| Crop + Resize | 영상의 공간 범위와 입력 크기 | 손·작업물·목표가 잘리지 않는가

| 카메라 선택·순서 | 정책에 들어가는 시점 | 설치 목록과 선택 입력을 구별

Progress는 episode의 진행도를, Success tail은 끝의 지정 sample을 True로 만드는 보조 label을 뜻합니다. 두 값은 로봇이 실제 작업을 성공했다는 외부 판정과 같지 않습니다. relative action도 단순히 값의 크기를 줄이는 옵션이 아니라 현재 pose에서 목표를 어떻게 표현하는지 결정합니다.

Crop Preview에서는 원본과 cropped/resized 입력을 나란히 보게 했습니다. 배경을 줄이려다 파지할 물체나 목적지가 잘리면 입력 의미가 달라집니다. crop 범위를 유지한 채 활성화 여부만 바꾸는 경우도 있으므로 저장 preset과 실제 적용 상태를 함께 확인해야 했습니다.

### 3.3 팔·그리퍼·로봇손의 observation과 action

소유자별 IO 해석
| 대상 | Observation | Action

| 로봇 팔 | 관절·속도·현재 TCP pose | 목표 위치·회전

| 이진/위치 그리퍼 | schema에 존재하는 이전 명령 context | 개폐·위치·힘 목표

| 로봇손 | 관절 feedback와 이전 grasp command context | 목표 관절·grasp state/mode/force

| 보조 출력 | 선택한 학습 입력과 별개 | Progress / Success label

| Padding | 실제 행동 값이 아님 | 끝부분에서 유효 horizon을 구별하는 mask

현재 hand feedback과 이전 step의 hand command는 의미가 다릅니다. 둘 다 관측에 들어갈 수 있어도 명령을 센서 측정값으로 읽으면 상태 해석이 달라집니다. robot-keyed 데이터에서는 이 구분을 각 owner 아래에서 유지해야 합니다.

학습에서 hand output을 선택했다면 checkpoint도 해당 장치 명령을 내는 모델입니다. 배포 때 같은 소유자·장치 구성인지 확인해야 하며, 입력·출력 차원만 맞는 것으로 충분하지 않습니다.

### 3.4 모델 설정을 운영자가 구분할 수 있게 설명

매뉴얼의 모델·학습 설정 묶음
| 묶음 | 주요 항목 | 운영상 구별할 것

| ACT recipe | action horizon·auxiliary head·VAE·Transformer·vision | 행동 chunk 길이와 모델 구조

| Optimization | epoch·batch·learning rate·weight decay | 학습 반복과 optimizer 업데이트

| Runtime | workers·gradient clip·seed | 데이터 공급·안정화·재현 조건

| Success detector | auxiliary batch | 선택 label과 head가 해당 모드인가

| Diffusion recipe | observation/action steps·train/inference timesteps·target | 행동 horizon과 실제 실행 수, 학습 noise 단계와 추론 반복

설정 항목을 모두 학습 시간이라는 한 종류의 값으로 다루지 않았습니다. Diffusion의 train timesteps는 epoch 수와 다르고, horizon은 생성할 행동 길이이며 action steps는 그중 실행할 구간입니다. ACT와 DP의 공통 학습 조작과 모델 고유 설정을 나누어 설명했습니다.

ACT — chunk와 실행 시간축 →

Diffusion Policy — 생성과 실행 계약 →

## 4. 문제 대응과 Engineering Note

### 4.1 처음부터 재설정하기 전에 막힌 경계를 확인

운영에서 구분한 실패와 확인 순서
| 현상 | 확인 지점 | 판단

| 로봇 등록 실패 | 전원·오류·응답과 실제 등록 대상 | 장치 접속과 session 설정을 분리

| TeleT 진입 불가 | participant별 mapped input·유효 상태 | 표시된 robot의 입력 준비를 확인

| 한 대만 mode 전환 | 개별 선택과 session 전체 fan-out | 다른 participant까지 같은 상태인지 확인

| 필수 camera 해제 후 Stop | camera stream·Capture Plan 요구 | 원인 복구 후 저장 episode 상태 확인

| 영상 없이 H5만 있음 | sidecar 참조와 실제 MP4 | robot 값과 vision readiness를 구분

| 학습 입력이 비거나 누락 | curation·trim·선택 key·camera order | 선택 조건부터 다시 점검

복구 순서는 무조건 장치를 다시 등록하는 것이 아니라 어느 단계까지 정상인지 좁히는 방식으로 정리했습니다. 입력·mode·recording·저장·학습 준비를 나누면, 같은 “안 된다”는 현상에서도 다시 확인할 대상이 달라집니다.

### 4.2 Engineering Note

매뉴얼을 쓰면서 UI에서 한 로봇을 고르는 행동과 두 로봇이 함께 성립해야 하는 조건을 분리해야 한다는 점을 다시 확인했습니다. 한쪽만 mode가 바뀌는 문제는 버튼 이름을 자세히 적는 것으로 해결되지 않았고, 명령 범위와 기대 결과를 함께 설명해야 했습니다.

또한 저장·시각화·학습을 한 문서에 연결하자 설정 하나가 뒤 단계의 의미를 바꾸는 지점이 보였습니다. EE owner, camera order, relative 표현과 이전 command context는 다음 사람이 데이터를 해석하는 기준이므로, 운영 문서에도 그 이유가 남아 있어야 한다고 생각하게 됐습니다.

CONTINUE READING

## Related Records

Technical Report

### 기술 문서화·인수인계

기존 시스템을 이해한 내용을 온보딩·아키텍처·운영·진단 문서로 정리하고 전달했습니다.
↗

Technical Report

### 독립 다중 로봇 지원

독립된 Indy12 두 대의 session·소유권·raw schema를 설계하고 수집·학습·추론·시각화·Replay까지 연결했습니다.
↗
