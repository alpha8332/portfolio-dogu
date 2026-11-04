# Manus Glove · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/teleoperation/devices/manus.html

장치 원리

# Manus Glove

사람 손 skeleton을 로봇 핸드 관절 목표로 변환하는 retargeting 경로.

TeleoperationManusRetargeting

MY ROLE
장치 사용 · 입력과 로봇 제어 경로 이해

DOCUMENT
Technical Report

Manus Glove의 사람 손 관측을 wrist-local 손끝 관계로 바꾸고, Tesollo 손의 FK·관절 제한 안에서 목표를 찾는 retargeting으로 연결했습니다. 입력 glove와 출력 robot hand의 소속, 목표와 feedback, 처리 주기를 분리해 이해했습니다.

## 1. 입력 형상·소속·좌표계

### 1.1 Skeleton Is Geometry, Not a Robot Joint Vector

[그림: MANUS Quantum Metagloves — 제품군 참고]

MANUS Quantum Metagloves — 제품군 참고
손가락을 측정하는 glove의 외형 참고입니다. 본문의 wrist-local 변환·retargeting은 MiMicX 구현으로 설명하며 이 제품 사진으로 실사용 세대를 확정하지 않습니다.

MANUS · 공식 제품 이미지

MiMicX의 Manus adapter는 ergonomic 값과 skeleton·wrist 정보를 받습니다. 해당 adapter 경로의 ergonomic은20개 값, skeleton은25개 point의 position·quaternion 표현입니다. 이 로컬 배열 구성을 모든 MANUS SDK skeleton의 보편 형식으로 일반화하지 않습니다.[MANUS]

사람과 로봇은 링크 길이·손가락 구조·가동 범위가 다릅니다. Glove의 같은 번호 관절을 로봇 관절에 복사하기보다 손끝 위치와 손끝 간 관계를 이용합니다. 손목의 공간 이동과 손 모양도 분리해야 합니다.

### 1.2 Two Input Streams and Their Data Shapes

SDK에서 오는 두 입력
| 입력 | 로컬 표현 | 사용 목적

| ergonomic | 20개 값 | 손가락 활동·gesture 관련 관측

| skeleton raw | 25×7: position3 + quaternion4 | 손의 기하·wrist orientation

| skeleton xyz | 25×3: position만 | wrist-local 변환·손끝 추출

| physical side / source identity | SDK side와입력장치식별 | robot target owner와대응

SDK 연동 process가 보내는 stream을 subscriber가 받고, 숫자 payload와 metadata를 나눠 해석합니다. Skeleton의 25개 point를 각 7개 값으로 복원하며, 첫 wrist point가 손목 위치·회전 변환의 기준입니다. Source identity·battery·side 같은 metadata를 기하 배열에 잘못 포함하면 point index가 밀릴 수 있습니다.

입력은 ZMQ subscriber 경로에서 갱신하고 latest sample로 공유합니다. 한쪽 glove를 선택하면 해당 source만 filter하며, SDK physical side와 robot arm side는 별도 필드로 관리합니다. 20개 ergonomic 값의 길이만 18개에 맞추어 robot target으로 넣는 변환은 이 retarget 경로가 아닙니다.

### 1.3 Human Source Side and Robot-Hand Owner

Manus left/right는 사람 손의 side이고 target hand의 robot·arm 소속은 별도입니다. Source glove, robot hand, profile, 손가락·joint 순서와 관절 수를 함께 대응시킵니다. 같은18개 값이라는 이유만으로 어느 손의 데이터인지 판단하지 않습니다.

현재 robot-mounted Tesollo owner는 end-effector registry를 우선 사용하고 legacy hand-device는 호환 경로로 남습니다. Glove는 입력 장치 registry에 있습니다. Source와 target의 등록 경계를 섞으면 capture·retarget·command에서 서로 다른 손을 가리킬 수 있습니다.

### 1.4 Remove Wrist Translation and Rigid Rotation

hi=RwT(piW−pwW)Wrist-local fingertip geometry
p_i^W는 입력 point, p_w^W는 wrist point, R_w는 wrist orientation입니다. 손목 위치를 빼고 그 회전의 역을 적용하면 손 전체를 옮기거나 돌리는 성분을 제거합니다. 같은 손 모양이라면 전체 wrist motion이 손가락 target을 바꾸지 않게 하기 위한 변환입니다.

현재 구현은 wrist-local 입력에 palm-centering을 다시 적용하지 않고 설정된 Manus→robot 회전으로 축을 맞춥니다. 남아 있는 자동 rotation calibration 함수는 호환용 no-op입니다. 따라서 live input을 보정할 때는 이 함수 호출보다 실제 적용된 basis 설정을 확인해야 합니다.

### 1.5 Why Wrist-Local Geometry Removes Rigid Hand Motion

pi′=Qpi+t,Rw′=QRw,hi′=RwTQTQ(pi−pw)=hiInvariance under a common rigid transform
손 전체에 같은 회전 Q와 이동 t를 적용하면 wrist 위치에도 같은 변환이 적용됩니다. 두 위치를 빼면 t가 사라지고, wrist 회전의 역을 곱하면 QᵀQ=I로 전체 회전도 사라집니다. 손 전체의 공간 이동과 손가락 모양 변화를 분리할 수 있는 이유입니다.

이 불변성은 입력 point와 wrist orientation이 같은 frame에서 일관되게 들어온다는 전제입니다. Quaternion 순서가 다르거나 wrist 정보가 오래되면 같은 손 모양도 다른 target이 됩니다. 이후의 Manus→robot fixed basis는 두 손 모델의 축 정렬이며 매 frame 손목의 공간 회전을 제거하는 단계와 다릅니다.

## 2. 기하학적 목표와 최적화

### 2.1 Four Wrist-to-Tip Vectors and Six Fingertip Pairs

[그림: 네 손끝의wrist vector와여섯pair vector를구분한직접작성기하도. Pinch는사람관절각을복사하는대신특정손끝관계를강하게보존하도록목표를바꿉니다.]

네 손끝의wrist vector와여섯pair vector를구분한직접작성기하도. Pinch는사람관절각을복사하는대신특정손끝관계를강하게보존하도록목표를바꿉니다. 크게 보기 ↗

zi=Chhtip i,bi=βzi,bij=fijzi−zj‖zi−zj‖+εBuild the geometric targets
Cₕ는 설정한 Manus→robot 방향 회전입니다. 로컬 기본 tip index 4, 9, 14, 19로 네 손끝을 선택합니다. Wrist에서 각 tip으로의 vector 4개와 i<j인 pair vector 6개를 만듭니다. 일반 상태의 pair 목표 길이는 fᵢⱼ=β‖zᵢ−zⱼ‖이며, ε는 길이가 0일 때 나눗셈을 안정화하는 작은 값입니다.

Wrist vector는 손 전체의 펼침 정도를, pair vector는 어느 손끝끼리 가까운지와 그 방향을 담습니다. 같은 관절각도 사람과 로봇의 링크 길이가 다르면 다른 손끝 위치를 만듭니다. 네 tip의 12개 성분과 여섯 pair의 18개 성분은 기하 잔차의 구성이며 30개의 물리 자유도를 뜻하지 않습니다.

### 2.2 FK-Constrained Retargeting Objective

[그림: Figure 7. Wrist-local 사람 손끝에서 목표 vector를 만들고 로봇 FK와 비교해 관절을 최적화합니다. 논문의 vision 입력과 달리 이 구성은 Manus skeleton·Tesollo 모델을 사용합니다.]

Figure 7. Wrist-local 사람 손끝에서 목표 vector를 만들고 로봇 FK와 비교해 관절을 최적화합니다. 논문의 vision 입력과 달리 이 구성은 Manus skeleton·Tesollo 모델을 사용합니다. 크게 보기 ↗

q*=argminqmin≤q≤qmaxJ(q)Retargeting objective
J=12∑iwi‖yi−bi‖2+12∑i,jwij‖yi−yj−bij‖2+γ‖q‖2Weighted residuals
q는 rad 단위 로봇 joint vector, y_i(q)는 wrist-local FK 손끝, b_i와 b_ij는 사람 손끝에서 만든 목표입니다. 네 손끝과 그 pair 관계를 가중 residual로 비교하고 γ‖q‖²로 과도한 joint 크기를 억제합니다. DG-4F-M 경로는18개 target을 사용하지만 고정 base joint를 제외한 일부만 최적화할 수 있습니다.

DexPilot 원 논문은 vision 기반 사람 손 관측을 사용합니다. 여기서는 그 원리를 활용하는 기존 retargeter와 Manus 입력·Tesollo FK를 사용했습니다. 제 작업은 이 retargeter를 활용해 입력·장치 소속·실행 설정을 연결하고 실제 손 동작을 확인하는 것이었습니다.[DEX]

### 2.3 Pinch Targets: Distance, Direction and Weight

DG-4F-M 설정 예와pair 정책
| 조건 | 목표길이 | pair weight

| 일반pair | βdᵢⱼ, β=1.6 | 1

| 엄지와다른tip의거리≤0.015 m | η₁=0.0001 m | s₁=200

| 두non-thumb tip이동시에엄지pinch | max(βdᵢⱼ,η₂), η₂=0.03 m | s₂=400

엄지 접촉 pair는 방향 vector를 유지하면서 목표 길이를 작게 하고 가중치를 높입니다. 사람이 pinch를 만들 때 로봇도 그 손끝 관계를 우선 맞추게 합니다. 동시에 엄지에 접촉한 다른 두 tip 사이는 최소 목표 거리를 두어 모든 tip을 같은 점으로 몰지 않습니다.

이 숫자는 보존된 설정 예이며 접촉 정밀도의 측정치가 아닙니다. η₁=0.1 mm의 target을 두었다고 실제 손끝이 0.1 mm 오차로 접촉했다는 뜻은 아닙니다. Joint limit, FK 모델과 실물의 접촉 조건이 함께 작용합니다.

### 2.4 Joint Constraints, Seed Priority and Fallback

q=expand(qseed,x),qmin≤q≤qmaxOptimize active coordinates inside the full joint vector
Robot FK는 전체 q의 18개 target을 사용하지만 optimizer는 optimize_joint_indices에 포함한 변수만 바꿉니다. 고정 joint는 seed 값을 보존하고, 활성 변수 x를 전체 q에 끼워 넣어 FK와 cost를 평가합니다. 최종 출력 차원과 실제 최적화 변수 수를 분리해야 합니다.

Seed 우선순위는 명시 q₀, q_ref, 이전 해를 쓰는 warm start, 그 외에는 0입니다. Hand runtime이 prev를 q₀로 전달하는 경로에서는 그 값이 우선합니다. 내부 warm-start extrapolation 설정이 있어도 모든 frame에 외삽이 적용되는 것은 아닙니다. Seed와 최종 해는 joint bounds로 제한합니다.

Solver는 설정에 따라 L-BFGS-B 또는 SLSQP를 사용합니다. L-BFGS-B가 실패하면 그 결과를 시작점으로 SLSQP를 시도하고, 성공한 fallback을 채택합니다. Success flag, iteration 수와 FK 횟수를 따로 보아야 해를 반환했다는 사실과 의도한 오차로 수렴했다는 결과를 구분할 수 있습니다.

### 2.5 Residual Jacobians and the Cost of Real-Time Solving

∇J=∑iwiJiTri+∑i<jwij(Ji−Jj)Trij+2γqGradient of weighted geometric residuals
Jᵢ=∂yᵢ/∂q, rᵢ=yᵢ−bᵢ, rᵢⱼ=(yᵢ−yⱼ)−bᵢⱼ입니다. FK Jacobian은 tip 오차를 줄이려면 어떤 joint를 어느 방향으로 움직여야 할지 계산하는 데 쓰입니다. 같은 x에서 cost와 gradient를 중복 요청하면 cache한 FK와 잔차를 재사용합니다.

현재 FK Jacobian 경로는 vendor symbolic 결과를 wrist-local basis로 옮기고, 신뢰할 수 없는 마지막 두 joint 열16·17은 모델 frame에서 유한차분으로 보완합니다. Symbolic kernel이 없으면 wrist-local FK의 전체 유한차분으로 돌아갑니다. 결과 shape(4,3,18)는 네 tip의 xyz가18개 joint에 얼마나 민감한지 나타내는 미분이며 새 관측값의 차원이 아닙니다.

FK Jacobian이 없으면 q의 각 축을 조금씩 바꿔 cost를 다시 계산하는 수치차분이 필요해 FK 호출이 늘어납니다. 현재 live solver는 높은 차분 비용을 피하도록 조건에 따라 명시 cost Jacobian을 끄고 solver 경로를 선택합니다. 설정명만 보지 않고 실제 backend와 실행 통계를 함께 확인해야 합니다.

손끝 변화가 설정 threshold보다 작고 warm start를 사용하면 static-target skip으로 이전 seed를 유지할 수 있습니다. 이때 iteration 0은 새 target을 최적화해 빠르게 수렴했다는 결과와 다릅니다. 실시간성은 Hz 하나보다 stale target, solver 횟수, queue age를 함께 봐야 판단할 수 있습니다.

## 3. 실시간 실행과 명령

### 3.1 Latest-Only Input → Retarget → Tx Pipeline

[그림: Figure 8. 입력·최적화·전송을 분리하고 bounded latest-only queue를 사용합니다. 예시는 처리가 밀린 상황의 정책 설명이며 실제 측정 latency chart가 아닙니다.]

Figure 8. 입력·최적화·전송을 분리하고 bounded latest-only queue를 사용합니다. 예시는 처리가 밀린 상황의 정책 설명이며 실제 측정 latency chart가 아닙니다. 크게 보기 ↗

Threaded 구성은 Input, Retarget, Tx의 세 실행 단계를 나누고 input→retarget, retarget→Tx queue를 bounded latest-only로 운영합니다. Size1 기본 구성은 오래된 sample을 계속 쌓기보다 최신 상태를 우선합니다. Single-loop 경로도 호환용으로 남습니다.

설정의 input/retarget/tx 60 Hz와 motion_time25 ms는 목표값입니다. 실제 주기·solver 시간·command 송신·feedback 읽기·queue drop·backlog를 따로 관찰해야 합니다. 세 단계 중 하나만 느려도 손이 늦게 따라오는 체감이 생기므로 단순히 “network가 느림”으로 묶지 않습니다.

### 3.2 Latest-Only Queues and Motion-Time Semantics

입력·solve·Tx가 서로 다른 속도로 실행될 때 FIFO에 모든 sample을 쌓으면 과거 손 모양을 차례로 재생하게 됩니다. Queue size 1의 drop-oldest와 consumer stale-drain은 대기 중인 오래된 값을 버리고 현재 상태에 가까운 target을 선택하는 정책입니다.

Target 60 Hz의 주기는 약 16.7 ms이고 motion_time 25 ms는 hand controller에 보내는 이동 profile 시간입니다. 25 ms는 MiMicX의 고정 loop 주기나 측정된 end-to-end latency가 아닙니다. 이전 목표의 도달을 매번 기다리는 동기식 25 ms 반복도 아닙니다. Input·retarget·Tx Hz와 feedback 읽기 stride를 따로 관리합니다.

### 3.3 Degree Conversion, Smoothing and Fixed Base Joints

θnew=180πq*,θout=θprev+α(θnew−θprev),α=1−sPost-solve command smoothing
Smoothing s는 0~0.95로 제한하고 α=1−s를 사용합니다. s=0.2일 때 출력은 이전 값 20% + 새 해 80%입니다. 새 목표가 10°, 이전 명령이 0°라면 8°가 됩니다. s를 그대로 새 target의 가중치로 쓰면 다른 필터가 됩니다.

그다음 base joint 고정값, profile별 lower/upper limit, auto-safe clamp를 적용합니다. 보존된 live preset은 오른손 base [0,−140]°, 왼손 base [140,0]°를 설정합니다. 18개 전송값이 있어도 base까지 모두 자유롭게 조작하는 것은 아닙니다. Optional LPF는 별도 설정이며 smoothing과 동일한 기능으로 보지 않습니다.

### 3.4 Joint Target, Gesture Primitive and Measured Feedback

Solver의 rad 결과를 degree로 바꾸고 smoothing·joint clamp·선택 base 고정·optional filter를 적용해 joint_move_to로 보냅니다. Driver는 degree target을 정수 register 표현으로 변환합니다. 하위 motor servo는 장치 내부에서 수행하며, MiMicX가 retarget 계산과 동시에 직접 전류 PID를 구현하는 구조는 아닙니다.

θi=qi*180π,ri=int(10clip(θi,−180,180))Radians, degrees and transport representation
Driver의 각도 표현은 0.1° 단위 정수입니다. 예를 들어 12.34°는 변환 후 123으로 전송됩니다. ±180°는 driver의 표현 범위이고, 실제 사용할 joint 한계는 그 전에 profile별로 제한합니다. Modbus/TCP 전송에서는 motion time을 먼저 설정한 뒤 position target을 써서 해당 목표에 의도한 이동 시간이 적용되도록 합니다. 동일 motion time의 반복 쓰기는 cache로 줄입니다.

Gesture mapping은 grasp/release·mode 등의 primitive 경로이며 연속 joint streaming과 다른 명령입니다. 같은 target에 어떤 모드가 활성인지 확인하고 joint command, 실제 joint feedback, grasp state/mode/force를 각각 남깁니다. Command와 feedback이 비슷해 보여도 하나로 대체해 수집하지 않습니다.

## 4. 서보·제스처·데이터 의미

### 4.1 Retargeting Is the Outer Problem; PD/PID Follows a Given Target

[그림: 손 모양→관절 목표를 구하는 상위 최적화와, 주어진 목표를 추종하는 하위 servo를 나눈 도식. PD/PID 식은 gain 역할을 설명하는 제어 모델입니다.]

손 모양→관절 목표를 구하는 상위 최적화와, 주어진 목표를 추종하는 하위 servo를 나눈 도식. PD/PID 식은 gain 역할을 설명하는 제어 모델입니다. 크게 보기 ↗

ej=qdes,j−qmeas,j,uj=KP,jej+KD,jdejdt+KI,j∫ejdtPosition error and standard PD/PID model
P항은 현재 위치 오차, D항은 오차의 변화, I항은 누적 오차에 작용하는 표준 제어 모델입니다. PD는 I항을 쓰지 않습니다. 주어진 q_des를 실제 q가 따라가게 하는 문제이며, 사람 손 모양에서 어떤 q_des를 만들지는 앞의 retarget optimizer가 담당합니다.

보존된gain preset의설정 예
| preset | mode | P / D / I | I limit | 사용 해석

| pd_default | PD | 180 / 5 / 0 | 10 | live preset의 기본 참조

| pid_precise | PID | 200 / 6 / 0.1 | 12 | 별도 선택 가능한 설정

MiMicX는 gain mode·gain 값과 joint target을 장치 통신 경계로 전달합니다. Motor의 실제 servo는 Tesollo firmware가 실행합니다. 위 식의 u 단위와 내부 제어 구현을 MiMicX의 target 생성식으로 대신하지 않습니다. Gain을 바꾸어도 사람과 로봇의 링크 길이·관절 배치 차이가 해결되지 않는 이유입니다.

### 4.2 Gesture Grasp and Arm-Gate Actions Are Separate Paths

연속 joint retargeting 외에도 엄지와 다른 손끝의 거리로 gesture를 분류하고 grasp/release, grasp mode·force 등의 primitive에 매핑할 수 있습니다. 이는 18개 joint target을 반복 전송하는 streaming과 다른 명령 경로입니다. 같은 손에 어느 경로가 적용되는지 구분합니다.

Grasp primitive의 종류 — SDK/장치 mode와 연결
| primitive | 의미

| 31 / 32 / 33 | four-finger centroidal / parallel / envelop

| side-aware one-hand / two-finger | robot side에 맞는 mode 선택

| release / force / mode / grasp | 해제·힘 설정·모드 선택·파지 요청을 구분

다른 gesture action은 Vive Tracker의 arm gate를 toggle합니다. 이 경우 glove의 손 모양은 조작 허가 신호이고 팔 목표는 Tracker에서 계산합니다. Source glove side → robot side → 해당 Tracker binding의 연결과 robot-hand target owner를 구분합니다.

### 4.3 What Is Captured: Source, Target and Actual Joint State

손데이터의의미
| 단계 | 표현·단위 | 확인 대상

| Manus source | ergonomic20 / skeleton25×3 | 원래사람손입력

| Retarget result | q* rad → target degree18 | 모델기하에맞춘목표

| Hand command | owner가정해진joint position / grasp command | 실제로발행한명령

| Hand feedback | 실제joint degree·degree/s | 장치응답

| Runtime statistics | sample timestamp·frame·stage time | 최신성·처리병목

Live runtime의 모든 debug stream이 recording에 저장되는 것은 아닙니다. 수집 계획과 writer filter가 선택한 항목만 저장합니다. 특히 양손은 target owner가 붙은 command key를 사용해야 공통 이름의 18개 배열이 덮이거나 뒤바뀌는 문제를 피할 수 있습니다.

로봇 손의 feedback이 바뀌는 것과 물체를 잡는 것은 다른 관찰입니다. Solver success만으로 grasp 성공이라고 평가하지 않고 source 형태, target, 실제 관절과 접촉 상태를 이어 보며 조작을 확인했습니다.

## 5. 검증과 설계 판단

### 5.1 Verify Shape, Ownership and Physical Grasp Separately

조작 확인
| 대상 | 확인

| 손목 rigid motion | 같은 finger shape의 wrist 이동·회전 영향

| Source/target side | 올바른 glove가 올바른 로봇 hand 제어

| Joint profile | 관절 수·순서·limit·고정 base

| Solver·전송 | 수렴·실제 주기·stale queue

| 물체 접촉 | 손끝 간 모양과 실제 파지 상태

Manus 입력이 자연스럽게 보이는 것과 로봇이 안정적으로 물체를 잡는 것은 다른 확인입니다. 작은 물체, 깊은 파지, 손가락 간 간섭에서는 기하 관계·관절 범위·접촉점을 함께 봐야 했습니다. 학습 데이터 schema와 출력 복원은 Tesollo Hand 학습 파이프라인에 따로 정리합니다.

### 5.2 Engineering Note

사람과 로봇의 형태가 다를 때 각도를 같게 만드는 것보다 파지에 필요한 손끝 관계를 어떤 제약 안에서 보존할지 선택하는 것이 핵심이었습니다. Wrist-local 변환, pinch 가중치와 joint bounds는 서로 다른 문제를 푸는 단계입니다.

실시간성도 평균Hz만으로 판단할 수 없었습니다. 수렴한 해라도 오래된 손 모양이면 조작감이 나빠지고, 빠른 해라도 실제 접촉이 성립하지 않을 수 있습니다. 기하 오차·sample 최신성·실제 관절과 물체 상태를 따로 이어 보는 기준이 필요했습니다.

## References

- [MANUS] MANUS — Skeleton documentation
SDK skeleton의 개념. 본문의25point·20ergonomic은 로컬 adapter의 표현입니다.

- [DEX] DexPilot — Original research
원 연구의 vision-based retargeting과 이 구성의 Manus·Tesollo 적용을 구분합니다. 수식은 로컬 cost 구현을 설명합니다.

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

### Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.
↗
