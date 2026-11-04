# Vive Tracker · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/teleoperation/devices/vive-tracker.html

장치 원리

# Vive Tracker

버튼 없는 pose 입력과 명시적 활성화·reference 재설정.

TeleoperationVive TrackerOpenVR

MY ROLE
장치 사용 · 입력과 로봇 제어 경로 이해

DOCUMENT
Technical Report

Vive Tracker의 pose를 robot task target으로 연결하되, 명시적 활성화와 reference 재설정을 별도로 다뤘습니다.

## 1. 트래킹 입력과 활성화

### 1.1 Tracked Pose and Device Identity

[그림: VIVE Tracker 3.0 — 제품군 참고]

VIVE Tracker 3.0 — 제품군 참고
고정물이나 손등 등에 부착하는 추적 장치의 형상입니다. 실제 적용한 모델 세대·고정 방식과 제품 외형 참고를 구분합니다.

HTC VIVE · 공식 제품 이미지

Lighthouse는 외부 base station이 적외선 광 신호를 보내고 장치 표면의 센서가 이를 수신하는 추적 방식입니다. Base station이 카메라처럼 controller를 촬영하는 구조는 아닙니다. 장치가 신호를 받는 기하 조건이 중요하므로 몸·로봇·물체에 가려지는 구간과 장치 장착 방향을 함께 봐야 합니다. SteamVR이 계산한 pose를 받아 로봇 목표로 해석하는 단계는 이 광학 추적과 별개입니다.[LIGHT]

SteamVR/OpenVR에서 장치의 위치(m)와 회전을 읽습니다. Lighthouse tracking의 device role은 입력 장치 정보이고, 어떤 robot·arm을 움직이는지는 binding입니다. Pose가 갱신된다는 사실만으로 controller button도 유효하거나 로봇 명령이 수락됐다고 판단하지 않습니다.

Tracker는 손에 쥔 controller와 달리 물체나 신체에 고정해 pose source로 사용할 수 있습니다. 대신 controller trigger와 같은 사용자 gate를 그대로 기대할 수 없습니다.

### 1.2 OpenVR Pose Matrix, Validity and Orientation Conventions

Tx,k=[Rx,kxk0T1],Rx,k∈SO(3)Rigid pose supplied by the tracking runtime
OpenVR의 3×4 raw matrix는 왼쪽 3×3이 회전, 마지막 열이 m 단위 위치입니다. MiMicX는 raw matrix를 우선해 유한한 값인지 확인하고 proper rotation으로 투영합니다. Raw matrix가 없을 때는 position과 orientation으로 복원합니다. Vive adapter의 orientation_deg는 yaw/pitch/roll 순서이므로 Indy의 roll/pitch/yaw 순서에 그대로 넣지 않습니다.

Pose source와 control source
| 값·source | 의미 | 사용

| raw rotation + position | tracking base의 absolute pose | reference 대비 상대 변화 계산

| linear/angular velocity | runtime이 추정한 장치 속도 | 이 경로의 TCP 위치 적분 입력으로 쓰지 않음

| button state | controller input 별도 조회 | trigger·action gate

| device role / identity | 장치 측 정보 | robot arm binding과 별도

직접 OpenVR backend는 Standing tracking universe에서 pose를 읽고 bPoseIsValid를 확인합니다. 장치 index는 연결 때마다 달라질 수 있어 identity로 현재 index를 다시 찾습니다. Host bridge backend를 사용해도 로봇 resolver가 받는 것은 같은 의미의 pose·input snapshot입니다.

### 1.3 Buttonless Activation: Active Flag, Epoch and a Missing Reference

[그림: Pose-only Tracker의 실제 reference 흐름. teleop_active는 사용 허가이고 epoch는 새 기준을 요청하는 신호입니다. 둘을 동일한 상태로 합치지 않습니다.]

Pose-only Tracker의 실제 reference 흐름. teleop_active는 사용 허가이고 epoch는 새 기준을 요청하는 신호입니다. 둘을 동일한 상태로 합치지 않습니다. 크게 보기 ↗

Tracker는 controller trigger를 전제로 하지 않습니다. device_class·has_buttons 설정으로 pose-only 경로를 선택하고 teleop_active가 true일 때만 pose를 처리합니다. 추적 중이라는 사실은 로봇 조작 허가와 별개입니다.

Pose-only reference 처리
| 조건 | 동작

| teleop_active=false | motion target 생성하지 않음; active에서 해제되면 현재 pose 한 번 안정화

| teleop_active=true + 새 epoch | 현재 robot pose와 tracker sample을 함께 새 reference로 저장

| active이지만 reference 없음 | 첫 sample을 reference로 저장하고 이동 계산은 다음 sample부터

| active + 같은 epoch + reference 있음 | 기존 reference 대비 상대 위치·회전 계산

단순히 active flag를 켜는 것과 epoch를 갱신하는 것은 다릅니다. 현재 resolver에서 명시적 activation event는 epoch의 변경으로 발생합니다. 새 기준이 필요한 조작에서는 binding 갱신 시 epoch도 함께 전달해야 현재 robot·tracker pose를 한 쌍으로 다시 잡습니다.

### 1.4 Re-reference After Attachment or Posture Changes

Tracker 고정 위치나 장착 각도가 달라지면 같은 손 움직임이 이전과 다른 pose 변화로 표현됩니다. 명시적으로 비활성화한 상태에서 장착·자세를 정리하고 새 epoch로 reference를 잡아야 했습니다. 활성 중 장치를 다시 고정하면 그 변화도 조작 입력으로 해석될 수 있습니다.

Tracker와 glove를 함께 쓰는 구성에서는 손가락 gesture를 activation과 연결할 수 있지만, source glove side·대상 Tracker binding·robot arm의 대응을 명시해야 합니다. Gesture 사용 여부는 구성별 설정이며 Tracker 자체에 trigger가 생긴 것은 아닙니다.

### 1.5 Tracking Base, Robot Base and Calibration Persistence

C는 tracking base에서 robot base로 상대 변위를 옮기는 회전입니다. 저장된 calibration과 live reference를 구분합니다. 장치가 움직이지 않을 때의 robot 시작 pose를 정하는 것은 reference이고, 어떤 방향이 robot의 X/Y/Z인지 정하는 것은 C입니다.

Loader는 3×3 회전 또는 기존 uvw(rad) 값을 읽습니다. 회전은 CᵀC=I, det(C)=1 조건을 확인하고 필요하면 SVD로 proper rotation에 투영합니다. 파일을 읽지 못할 때의 identity fallback은 실제 축 보정을 대신하지 않으므로 작은 축 이동으로 방향을 확인합니다.

## 2. Pose 변환식 유도

### 2.1 Translation: Difference → Calibration → Scale → Unit Conversion

δxk=xk−x0,δpk=Cδxk,pcmd,mm=pr0,mm+1000stδpkPosition: tracking meters → robot millimeters
xₖ와 x₀는 tracking base에서 읽은 현재·활성화 기준 위치이며 단위는 m입니다. 먼저 δx=xₖ−x₀를 구하고, C로 robot base 방향에 맞춘 다음 translation scale sₜ를 적용합니다. 현재 로봇 위치에 더하기 전에 1,000을 곱해 mm로 바꿉니다. 원점이 다른 두 장치의 absolute 위치를 직접 더하지 않습니다.

계산 예시 — 실측값이 아닌 좌표 변환 예
| 단계 | 값·해석

| 시작 robot TCP | pᵣ₀=(400,100,300) mm

| 장치 상대 이동 | δx=(0.020,0,0) m

| 축 정렬 | C=Rz(90°) → Cδx=(0,0.020,0) m

| 이동 배율 | sₜ=0.5 → (0,10,0) mm

| 최종 목표 | p_cmd=(400,110,300) mm

C는 상대 변위의 방향을 바꾸는 회전입니다. 이 계산에는 tracking 원점과 robot 원점 사이의 translation offset을 다시 넣지 않습니다. 두 origin을 직접 일치시키는 absolute hand-eye pose 복사가 아니라, 활성화 이후 움직임만 로봇의 시작점에 적용하기 때문입니다.

### 2.2 Rotation: Relative Matrix → Rotation Vector → Scaled Rotation

RΔ=Rx0TRxk,φ=Log(RΔ),θ=‖φ‖Relative orientation in the activation frame
Dd(φ)={0‖φ‖≤d(1−d‖φ‖)φ‖φ‖>dAngular deadzone: shorten the rotation vector
Rₓ₀와 Rₓₖ는 tracking base에서 본 장치 회전입니다. Rₓ₀ᵀRₓₖ는 기준 장치 좌표에서 현재 자세가 얼마나 달라졌는지를 나타냅니다. Log는 이 회전을 φ=θa 형태의 rad 단위 벡터로 바꾸며, a는 단위 회전축이고 벡터 길이 θ가 회전각입니다. Euler angle 세 성분을 빼는 계산과 다릅니다.

기본 d=5π/180 rad입니다. 회전이 5° 이하면 영벡터, 5°를 넘으면 같은 축을 유지하면서 회전각에서 5°를 뺍니다. 이후 sᴿ를 곱하고 Exp로 행렬을 복원합니다. 예를 들어 입력 상대 회전 15°에 sᴿ=0.5를 적용하면 (15−5)×0.5=5°가 됩니다. 15×0.5=7.5°가 아닙니다.

회전 배율과 deadzone은 서로 다른 역할입니다. 배율은 의도한 회전 전체의 크기를 줄이고, deadzone은 작은 orientation 흔들림의 영향을 제거합니다. 현재 resolver는 두 scale을 0~1 범위로 제한하므로 저장 설정과 실제 적용값도 함께 봅니다.

### 2.3 Why the Intermediate Basis Matrix Is Necessary

[그림: 서로 다른 기준 자세의 상대 회전을 연결하는 직접 작성 도식. C는 두 base의 방향 정렬이고 B는 활성화 순간 장치 기준에서 robot TCP 기준으로의 basis 변환입니다.]

서로 다른 기준 자세의 상대 회전을 연결하는 직접 작성 도식. C는 두 base의 방향 정렬이고 B는 활성화 순간 장치 기준에서 robot TCP 기준으로의 basis 변환입니다. 크게 보기 ↗

B=Rr0TCRx0,Rcmd=Rr0BExp(sRDd(φ))BTBasis transport before applying the relative rotation
중간 basis의 의미
| 행렬 | 좌표 변환

| Rₓ₀ | 활성화 장치 기준 → tracking base

| C | tracking base → robot base

| Rᵣ₀ᵀ | robot base → 활성화 robot TCP 기준

| B=Rᵣ₀ᵀCRₓ₀ | 활성화 장치 기준 → 활성화 TCP 기준

상대 회전 ΔR은 활성화 순간의 장치 축으로 표현돼 있습니다. 이를 TCP 기준으로 바꾸려면 BΔRBᵀ가 필요하고, 그 결과를 시작 robot 자세 Rᵣ₀에 적용합니다. C를 한 번 곱하거나 RPY 성분을 교환하는 방법으로는 이 앞뒤 basis 관계를 보존할 수 없습니다.

φ=0⇒Rcmd=Rr0;sR=1,d=0⇒Rcmd=CRxkRx0TCTRr0Identity and unscaled sanity checks
움직임이 없으면 R_cmd가 Rᵣ₀와 같아야 하고, scale 1·deadzone 0이면 장치의 전체 상대 회전을 방향 정렬한 결과와 같아야 합니다. 이 두 조건은 실제 장비 시험 수치가 아니라 변환식을 점검하는 수학적 기준입니다.

### 2.4 Final Six-Value Target and the Controller Boundary

ξcmd=[pxpypzrollpitchyaw]T,R=Rz(yaw)Ry(pitch)Rx(roll)Indy task command representation
위치 세 값은 mm, roll·pitch·yaw 세 값은 degree로 인코딩해 absolute task target으로 보냅니다. 회전 행렬 계산에는 rad 단위 rotation vector를 사용하고, 최종 SDK 경계에서만 RPY degree로 바꿉니다. “6D pose”는 위치+회전 표현의 성분 수이며 로봇의 관절 수를 새로 정의하는 말이 아닙니다.

Robot worker는 이 목표와 velocity/acceleration ratio, 대상 arm index를 함께 Task TeleMove 명령으로 전달합니다. 상대 입력에서 계산했어도 최종 명령은 movetelel_abs입니다. Robot-base target과 모니터링용 다른 frame의 pose를 바꾸어 전송하면 좌표가 달라지므로 명령 source를 고정했습니다.

이 운영 경로에서는 live op_state의 TELE_OP 값17을 읽어 teleop 입력 분기로 들어갑니다. 설정 화면의 mode 이름만으로 명령을 실행하지 않습니다. SDK velocity/acceleration ratio는 controller 명령에 붙는 비율이고, 위의 translation/rotation scale은 입력 변화에서 목표를 만드는 배율입니다. 두 값을 같은 gain으로 묶지 않습니다. 저장된 command의 한 sample은6개 값이며 시간축으로 쌓인 배열은(T,6)입니다.

MiMicX는 목표를 만들고 전송하는 상위 계층입니다. 역기구학과 실제 joint 추종은 robot controller가 수행합니다. SDK 호출 성공, 실제 pose feedback의 변화, 물체 조작 완료는 각각 다른 확인입니다. 목표 값만 움직인다고 실제 팔이 따라갔다고 판단하지 않았습니다.

## 3. 장착과 복합 입력

### 3.1 Mount Geometry, Lever Arm and Occlusion

Tworld,tool=Tworld,trackerTtracker,toolRigid mounting relation — geometric interpretation
Tracker를 손등·도구에 고정하면 추적하는 것은 센서 원점의 pose입니다. 고정점과 작업점이 떨어져 있으면 회전 중 센서 원점도 원호를 따라 움직입니다. 이 기하 관계는 센서가 손목 위치를 정확히 측정해도 operator가 의도한 작업점과 다를 수 있음을 설명합니다. 현재 상대 pose resolver가 이 식의 별도 tool offset을 자동 추정하는 것은 아닙니다.

장착이 느슨하면 T_tracker,tool 자체가 바뀌므로 reference·calibration이 그대로여도 같은 몸 동작이 다른 입력을 만듭니다. 고정 상태를 먼저 확인하고, 장착 방향을 바꾼 뒤에는 새 reference와 축 방향을 점검합니다. Base station 가림으로 pose가 무효가 되는 문제와 고정부가 움직이는 문제도 나누어 봅니다.

### 3.2 Gesture Can Change the Gate, Not Replace Pose Tracking

Manus gesture로 Tracker의 arm teleop을 켜고 끄는 구성은 hand geometry 경로와 arm pose 경로를 연결한 것입니다. Gesture는 대상 robot·side에 맞는 compiled arm binding을 찾아 toggle을 요청하고, 실제 팔 목표는 여전히 Tracker의 pose에서 계산합니다.

입력 glove의left/right, Tracker binding의side, 대상robot arm을 각각 대응시켜야 합니다. 같은 이름의right라는 이유로 어느 로봇을 조작할지 추정하지 않습니다. 여러 robot binding이 있을 때 특정 target을 정하는 문제는 pose 수학 이전의 소속 문제입니다.

## 4. 신호 상태와 설계 판단

### 4.1 Release, Missing Sample and Session Exit Are Different

Trigger 또는 명시 gate의 해제는 현재 robot pose를 한 번 보내는 안정화 경로입니다. 반면 sample을 읽지 못하거나 pose가 유효하지 않으면 resolver는 새 목표를 반환하지 않을 수 있습니다. 새 목표가 없다는 것이 robot controller의 자동 Idle 전환을 의미하지는 않습니다.

Task TeleMove를 벗어나면 worker가 live reference와 입력 상태를 정리합니다. 재시작할 때 원점이 바뀐 tracking frame을 오래된 reference에 이어 붙이지 않고 새 기준을 잡습니다. 저장 calibration을 지우는 것과 live reference를 갱신하는 것도 분리합니다.

### 4.2 Checks During Actual Operation

진단 계층
| 관찰 | 의미

| SteamVR device·pose | 추적 runtime의 입력

| Activation·binding | 명령을 만들 대상·조건

| Calibration·reference | 변위를 로봇 축으로 해석하는 기준

| Target·live feedback | 의도와 실제 추종을 비교

당시 Vive 입력 회귀에서는 Host 단독 monitor에서도 button state가 없었습니다. Pose 정상과 action 정상은 분리해야 했습니다. 자세한 Linux 입력 진단·calibration 피드백 개발은 Linux Vive Tracking에 연결합니다. Tracker 사용 경험을 해당 알고리즘 전체의 신규 개발로 확대하지 않았습니다.

### 4.3 Engineering Note

계속 측정되는 pose와 지금 로봇에 적용할 pose는 같지 않습니다. 버튼 없는 Tracker를 쓰면서 센서의 가용성과 사용자의 조작 의도를 별도 상태로 표현해야 한다는 점이 중요했습니다. Active flag와 reference epoch를 분리한 이유도 여기에 있습니다.

장착 자세가 바뀌면 입력 기하도 달라집니다. Tracking이 안정적이라는 이유로 고정부·reference·robot 축까지 모두 정상이라고 판단하지 않고, 장치가 무엇을 실제로 측정하는지부터 확인하게 됐습니다.

## References

- [INPUT] Valve — OpenVR tracking reference
Tracking pose API와 application의 상대 목표 계산을 구분하기 위한 원리 참조.

- [LIGHT] HTC VIVE — Roomscale / Lighthouse tracking
외부 광원과 장치의 적외선 센서 관계. 세대별 세부 timing·정확도는 이 본문에서 추정하지 않습니다.

CONTINUE READING

## Related Records

Device Collection

### 장치별 동작 원리

장치별 입력·활성화·좌표 해석·target 생성 원리를 탐색합니다.
↗

Collection

### 조작·시연

로봇 구성·역할 분담·접촉과 파지의 조작 경험, 아홉 가지 시연 목차를 정리합니다.
↗

Technical Report

### Linux Vive Tracking

독립 Vive 입력 수집·시각화와 MiMicX calibration 피드백을 구분해 설명합니다.
↗
