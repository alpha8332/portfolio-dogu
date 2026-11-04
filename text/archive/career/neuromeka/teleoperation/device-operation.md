# 장치별 동작 원리 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/teleoperation/device-operation.html

DEVICE COLLECTION

# 장치별 동작 원리

장치별 입력·활성화·좌표 해석·target 생성 원리를 탐색합니다.

TeleoperationSpaceMouseOpenVROpenXRManusRobot Control

MY ROLE
장치 연동 · 텔레오퍼레이션 · 실물 확인

DOCUMENT
Technical Report

텔레오퍼레이션에서는 사람의 움직임을 그대로 복사하는 대신 입력의 의미를 로봇 명령으로 변환해야 했습니다. 축을 속도로 읽는 장치, 공간 pose를 읽는 장치와 손 모양을 읽는 glove의 경로를 나눴습니다.

장치별 원리는 여섯 Device Categories에서 설명합니다. 이 페이지는 공통 제어 구조·좌표·활성화·실행 상태·관측과 실제 조작을 연결하는 기준입니다.

BROWSE BY DEVICE

## Device Categories

장치 원리

### SpaceMouse

6축 입력을 속도로 해석하고 적분해 로봇 target을 만드는 원리.
↗

장치 원리

### Vive Controller

Trigger clutch와 상대 pose, 버튼·calibration의 역할.
↗

장치 원리

### Vive Tracker

버튼 없는 pose 입력과 명시적 활성화·reference 재설정.
↗

장치 원리

### Meta Quest

OpenXR pose와 squeeze·trigger·thumbstick·button의 결합.
↗

장치 원리

### Pico

OpenXR pose와 interaction profile·digital fallback의 차이.
↗

장치 원리

### Manus Glove

사람 손 skeleton을 로봇 핸드 관절 목표로 변환하는 retargeting 경로.
↗

## 1. 제어 구조

### 1.1 사람 입력·로봇 목표·피드백의 연결

[그림: Figure 1. 팔의 task pose와 손의 joint target은 별도 경로입니다. Binding·calibration·runtime gate를 거쳐 해당 robot/arm/hand로 명령하고, 전송한 target과 실제 feedback을 나눠 관찰합니다.]

Figure 1. 팔의 task pose와 손의 joint target은 별도 경로입니다. Binding·calibration·runtime gate를 거쳐 해당 robot/arm/hand로 명령하고, 전송한 target과 실제 feedback을 나눠 관찰합니다. 크게 보기 ↗

SpaceMouse는 HID sample, Vive는 SteamVR/OpenVR pose, Quest/Pico는 OpenXR session sample, Manus는 skeleton·ergonomic 스트림에서 시작합니다. 입력은 장치별 resolver 또는 retargeter를 통과합니다. 팔에는 TCP task 목표, 핸드에는 joint 목표나 grasp primitive가 전달됩니다.

직접 다룬 범위는 장치 등록·binding·calibration 적용, 텔레오퍼레이션 조작·시연과 MiMicX의 입력 연동·기능 확장·문제해결입니다. 기존 SDK·추적 runtime·DexPilot과 로봇 내부 servo를 활용했습니다. MiMicX의 장치 연결 계층을 확장하고, 실제 조작과 feedback으로 실행 결과를 확인했습니다.

### 1.2 작업 공간 pose와 로봇 관절각의 차이

Task TeleMove 경로는 로봇의 현재 task pose에서 입력을 해석해 absolute target을 반복 생성하고 IndyDCP3의 movetelel_abs에 보냅니다. Session 진입과 매 sample의 target 생성은 다른 단계입니다. 로봇이 해당 운전 상태에 도달해야 motion 처리가 이어집니다.

제어 단계의 책임
| 값·단계 | 의미 | 다음 단계

| Device sample | 입력 장치 기준의 값·유효성·시각 | binding·frame 해석

| Task target | robot base 기준 TCP 위치 mm·RPY degree | Task TeleMove 명령

| Joint target | 관절별 목표각 | 별도의 joint·hand command 경로

| Robot controller | 목표를 실제 기구 동작으로 추종 | 측정 pose·joint state 반환

6개 TCP pose 성분은 로봇의 물리 DOF 수가 아닙니다. Task TeleMove에서 역기구학과 하위 제어는 로봇 컨트롤러의 책임입니다. MiMicX의 상대 입력 계산과 컨트롤러가 수신하는 absolute command를 구분해야 “상대 조작인데 왜 abs를 보내는가”가 설명됩니다.

### 1.3 속도 입력·상대 pose·리타게팅

[그림: Figure 2. 같은 손 움직임도 입력 계열에 따라 목표가 다르게 변합니다. 일정한 축 입력은 시간에 따라 누적되고, 추적 pose는 기준 이후 변위에 대응하며, glove는 손 모양의 기하 관계를 최적화합니다.]

Figure 2. 같은 손 움직임도 입력 계열에 따라 목표가 다르게 변합니다. 일정한 축 입력은 시간에 따라 누적되고, 추적 pose는 기준 이후 변위에 대응하며, glove는 손 모양의 기하 관계를 최적화합니다. 크게 보기 ↗

입력 방식의 차이
| 장치 | 측정·해석 | 조작 기준

| SpaceMouse | 축 입력 → 속도 → 시간 적분 | 중립이면 추가 목표 적분 중단

| Vive Controller / Tracker | 추적 pose → reference 대비 상대 변화 | clutch·명시 activation 시 기준 설정

| Quest / Pico | 추적 pose + axis·click | pose gate·stick jog·gripper·button 분리

| Manus | 사람 손 skeleton → wrist-local geometry | robot profile의 FK와 joint limit로 retarget

## 2. 좌표계·설정·활성화

### 2.1 좌표계·단위·기준 pose

pcmd,mm=pr0,mm+1000stC(x−x0)Relative tracked pose → robot position
x·x₀는 tracking frame의 현재·기준 위치(m), C는 tracking basis에서 robot base로의 회전, s_t는 이동 배율입니다. p_r0는 활성화 순간의 로봇 위치(mm)입니다. 상대 변위를 먼저 구하므로 공간 원점의 절대 translation을 다시 더하지 않습니다. 단위 변환을 생략하면 이동 배율이 1,000배 달라지므로 m→mm 변환을 명시적으로 적용합니다.

RPY·rotation vector·quaternion은 동일한 회전의 서로 다른 표현입니다. 회전 차이는 행렬 또는 quaternion으로 계산하고 필요 시 rotation vector의 크기를 deadzone 처리한 뒤 RPY degree로 출력합니다. Euler 세 성분을 단순히 빼거나 더하는 계산으로 대체하지 않았습니다.

### 2.2 장치 매핑과 좌표 보정의 역할

Binding은 어느 입력이 어느 robot·arm을 제어할지 정하고 calibration은 그 입력의 축이 robot base에서 어느 방향인지 정합니다. 왼손 controller role과 로봇 left arm은 같은 이름이어도 자동으로 같은 소속이 아닙니다. 독립 로봇 두 대와 한 로봇의 양팔도 다른 session 구조입니다.

Indy12 두 대 구성에서는 두 로봇·각 EE를 등록하고 session participants와 stable order를 정한 뒤 입력을 각각 매핑했습니다. Calibration 파일이 있다는 사실만으로 선택 장치의 binding에 적용됐다고 보지 않고 loaded 상태와 현재 target을 확인했습니다. 설정 상태와 live op_state도 함께 봤습니다.

### 2.3 활성화·해제·재시작

[그림: Figure 3. Activation은 controller reference와 현재 로봇 pose를 함께 잡는 시점입니다. Release의 현재 pose 안정화와 재활성화의 새 reference를 구분해 과거 목표로 돌아가는 현상을 막습니다.]

Figure 3. Activation은 controller reference와 현재 로봇 pose를 함께 잡는 시점입니다. Release의 현재 pose 안정화와 재활성화의 새 reference를 구분해 과거 목표로 돌아가는 현상을 막습니다. 크게 보기 ↗

Vive controller의 trigger hold, Tracker의 teleop_active, XR의 squeeze hold/toggle, SpaceMouse의 중립은 서로 다른 activation 신호입니다. 입력을 놓았다고 backend session 자체를 매번 재생성하지는 않습니다. Live motion frame을 멈추고 현재 pose를 한 번 안정화한 뒤 다음 활성화에서 현재 위치를 기준으로 이어갑니다.

Tracking 유효성이 떨어지거나 focus를 잃으면 sample 사용을 중단해야 하지만, 저장 calibration까지 무조건 지워야 하는 것은 아닙니다. 재연결 후 공간 원점이 바뀌었다면 새 reference를 잡아야 이전 좌표 차이가 큰 이동 목표로 해석되지 않습니다.

## 3. 조작과 기술적 고찰

### 3.1 작업 단계에 맞는 입력 장치 선택

작업 단계와 입력 방식
| 필요한 조작 | 살펴본 특성 | 조작 판단

| 미세 위치·회전 분리 | SpaceMouse mask·gain·deadzone | 한 번에 바꿀 축을 제한

| 큰 공간 이동·자세 대응 | tracked pose·clutch | 팔 자세 여유와 재기준화 계획

| 팔과 gripper 동시 조작 | XR squeeze·trigger·stick | 입력 gate와 도구 owner 분리

| 손가락 모양·접촉 관계 | Manus retarget | profile·관절 범위·손끝 관계 확인

| 양팔 고정·조작 역할 | 두 입력 또는 operator 역할 분담 | 간섭 구간·재파지·정지 시점 합의

한 장치가 모든 단계에서 우수한 것은 아닙니다. 큰 변위에서는 직관적인 pose 입력도 접촉 직전에는 작은 손 떨림과 시야 제약의 영향을 받습니다. 낮은 gain은 정밀 조작을 돕지만 같은 이동에 필요한 손 동작이나 시간이 늘어납니다. 실제 작업은 입력 감도뿐 아니라 지지점·파지 위치·접근 방향도 함께 바꾸어야 했습니다.

### 3.2 명령·피드백·episode 시간축

조작 명령은 의도한 목표이고 feedback은 실제 로봇 상태입니다. 두 값을 함께 봐야 도달 지연, 미끄러짐, 접촉 이후의 차이를 구분할 수 있습니다. 화면 영상만 녹화한 시연과 observation·action·timestamp·owner metadata를 저장한 episode도 다릅니다.

수집에서는 동일 tick의 session 로봇 snapshot과 명령을 저장하고, hand·camera의 시각·validity와 별도 media를 연결합니다. 단순히 화면에서 두 팔이 비슷한 시점에 움직인다고 정량적인 동기화 오차까지 알 수는 없습니다. 학습·rollout을 수행한 실험은 별도 Experiments 기록과 구분합니다.

### 3.3 Engineering Note: 입력의 의미까지 포함하는 제어

처음에는 장치를 연결하고 값이 바뀌면 조작이 될 것으로 생각하기 쉽습니다. 실제로는 owner·frame·단위·reference·gate가 모두 맞아야 같은 입력이 의도한 동작이 됐습니다. 조그가 pose를 덮어쓰거나 손을 놓은 뒤 이전 목표가 남는 문제를 겪으며 입력값뿐 아니라 시작과 종료 조건도 제어의 일부라는 것을 배웠습니다.

물체 조작에서는 target의 정확성과 작업의 성립도 달랐습니다. 같은 자세 명령이라도 파지점·지지점·접촉 방향이 달라지면 결과가 바뀝니다. 이후에는 소프트웨어 경로와 실제 작업의 물리 조건을 함께 기록하는 방식으로 조작을 정리했습니다.

CONTINUE READING

## Related Records

Collection

### 조작·시연

로봇 구성·역할 분담·접촉과 파지의 조작 경험, 아홉 가지 시연 목차를 정리합니다.
↗

Technical Report

### Linux Vive Tracking

독립 Vive 입력 수집·시각화와 MiMicX calibration 피드백을 구분해 설명합니다.
↗

Technical Report

### XR 컨트롤러 응용

Quest/Pico의 pose 조작에 축 매핑 조그·analog 그리퍼·버튼 기반 수집과 모드 전환을 연결했습니다.
↗

Technical Report

### Docker·장치 연동

SpaceMouse·카메라의 직접 접근과 Vive·Quest/Pico의 Host VR bridge를 Docker 배포에 연동·안정화했습니다.
↗

Technical Report

### Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.
↗
