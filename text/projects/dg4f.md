# Tesollo Hand 학습 파이프라인 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/projects/dg4f.html

TECHNICAL REPORT

# Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.

ACTTesolloTensor LayoutImitation Learning

MY ROLE
핸드 학습 파이프라인 확장 · 실물 확인

DOCUMENT
Technical Report

Tesollo DG-4F의 관절 관측과 명령을 수집·전처리·ACT 학습·체크포인트·실시간 추론·핸드 실행으로 연결했습니다. 기존 팔·binary gripper 중심 경로에 좌우 소속, 핸드 profile, 관절 수와 grasp 명령을 보존하는 구조를 추가했습니다.

이 과정에서는 데이터 스키마를 확장하는 일과 모델 출력을 복원하는 일이 함께 필요했습니다. 손 출력 36개가 잘린 학습 오류뿐 아니라, mode가 −1로 저장되는 문제, UI에 없는 학습 키, 카메라 없는 핸드 학습, 추론에서 누락된 실시간 관측을 순서대로 해결했습니다.

## 1. 목적과 시스템별 책임

### 1.1 Problem, Hardware & Development Scope

Tesollo의 raw 데이터는 이미 저장되고 Visualization과 Replay에서도 확인할 수 있었습니다. 그러나 저장된 runtime ID를 학습용 좌우 key로 바꾸고, 모델이 요구하는 핸드와 현재 연결된 장치를 비교하며, policy 출력을 실제 명령으로 보내는 경로가 이어져 있지 않았습니다. 관절 벡터를 더하는 것만으로는 양손의 소속과 명령 의미를 유지할 수 없었습니다.

[그림: Tesollo DG-4F 공식 제품 사진]

Tesollo DG-4F
실제 사용한 DG-4F 제품군의 공식 사진입니다. 이 사례의 profile은 손 하나의 관절 위치·속도를 18개 값으로 다룹니다. 장착 실물이나 기업과제 수행 장면을 대신하는 사진은 아닙니다.

Tesollo · DG-4F 공식 제품 이미지

직접 확장한 범위는 raw command 기록, canonical schema와 변환, 학습 key 선택, artifact의 핸드 정보, ACT 혼합 출력 복원, live observation 공급과 runtime dispatch입니다. ACT의 기본 학습 알고리즘과 Tesollo 하위 제어기를 새로 만든 작업은 아닙니다. DG-3F profile이 코드에 존재하는 것과 제가 그 장비를 사용한 경험도 구분합니다.

입력 glove와 로봇에 장착한 hand는 서로 다른 장치입니다. Glove는 조작자의 손 동작을 제공하고 retargeting이나 gesture 해석을 거쳐 명령을 만들지만, 학습에서 observation.hand.*로 쓰는 값은 제어 대상 Tesollo의 실제 관절 feedback입니다. 조작자가 의도한 target과 로봇이 도달한 관절 상태를 같은 신호로 취급하지 않았습니다.

### 1.2 End-to-End Capture, Learning & Execution Architecture

[그림: Figure 1. 장치 runtime의 feedback·명령을 raw episode에 보존하고, owner를 해석한 canonical tensor를 학습에 사용합니다. 체크포인트를 불러온 뒤에는 기록 데이터가 아니라 live observation으로 policy를 실행하고 명령·관측을 다음 step에 연결합니다.]

Figure 1. 장치 runtime의 feedback·명령을 raw episode에 보존하고, owner를 해석한 canonical tensor를 학습에 사용합니다. 체크포인트를 불러온 뒤에는 기록 데이터가 아니라 live observation으로 policy를 실행하고 명령·관측을 다음 step에 연결합니다. 크게 보기 ↗

장치와 명령 상태는 backend의 robot-hand runtime이 관리합니다. Capture worker는 그 시점의 feedback·command·timestamp·validity와 attachment metadata를 기록합니다. 전처리는 이 기록을 읽어 학습용 observation과 action을 만들고, Training 서비스는 선택한 입력·출력과 통계, 장치 요구사항을 artifact에 보존합니다.

추론에서는 다른 경로가 열립니다. Backend telemetry를 canonical observation으로 조립하고 학습과 같은 key·shape·정규화 규칙으로 tensor를 만듭니다. Policy가 예측한 chunk를 복원·분할한 뒤 command builder가 owner별 명령으로 바꿉니다. 하드웨어 주소는 마지막 runtime routing에서 결정하며 학습 데이터의 임시 runtime ID를 그대로 재사용하지 않습니다.

학습과 실행을 나눴기 때문에 한 단계의 성공이 전체 성공을 대신할 수 없었습니다. Raw key가 보인다는 것, UI에서 고를 수 있다는 것, 학습 loss가 계산된다는 것, live tensor가 만들어진다는 것, 실제 핸드가 명령을 받는다는 것을 각각 연결해야 했습니다.

### 1.3 Ownership: Runtime Address, Side and Robot Key

[그림: Figure 2. 같은 18개 값도 어느 로봇의 어느 손인지에 따라 다른 명령입니다. Legacy 좌우 경로와 robot-keyed 경로를 구분하고, 학습 시의 stable owner를 현재 물리 장치에 연결합니다.]

Figure 2. 같은 18개 값도 어느 로봇의 어느 손인지에 따라 다른 명령입니다. Legacy 좌우 경로와 robot-keyed 경로를 구분하고, 학습 시의 stable owner를 현재 물리 장치에 연결합니다. 크게 보기 ↗

식별자가 갖는 서로 다른 역할
| 식별 항목 | 의미 | 사용하는 경계

| runtime_id | 당시 연결된 핸드 runtime 주소 | raw key와 현재 dispatch target

| side: left / right | 양팔·휴머노이드 안의 손 소속 | legacy canonical key와 좌우 attachment

| robot_key | session 안의 독립 로봇 소속 | robot-keyed observation/action·EE contract

| profile_id / joint_count | 핸드 종류·관절 벡터 폭 | 변환·학습 선택·deploy 호환 검사

Legacy raw의 hand.tesollo.<runtime_id>.*는 episode에 저장한 robot_hands 또는 호환 hand_devices metadata로 좌우를 해석합니다. 연결 순서, runtime ID의 끝자리, 현재 UI 목록 순서로 과거 데이터의 좌우를 추측하지 않았습니다. Side가 없거나 한 side에 여러 runtime이 겹치면 변환을 중단합니다.

여러 single-arm 로봇은 robot.<robot_key>.hand.*와 observation/action.robot.<robot_key>.hand.*로 소속을 유지합니다. 이 경로를 left/right 두 자리로 억지로 접지 않고, 실행할 때 robot_key→robot_id→attached hand 순서로 해석합니다. 팔의 arm_index는 핸드의 물리 identity를 대신하지 않습니다.

관절 수가 맞아도 다른 손으로 보낼 수 있습니다. 따라서 “18차원인가?”보다 먼저 “어느 owner의 어떤 profile인가?”를 확인하도록 설계했습니다. 동일한 데이터셋 안에서 같은 owner의 profile·관절 폭이 달라지는 경우도 일관된 학습 대상으로 받아들이지 않습니다.

## 2. 수집과 데이터의 의미

### 2.1 Capture Contract: Feedback, Commands & Validity

raw에서 학습 재료로 남긴 값
| raw suffix | 형태 / 단위 | 역할

| feedback.joint_pos_deg | 18-vector / degree | 현재 관절 상태

| feedback.joint_vel_deg_s | 18-vector / degree·s⁻¹ | 현재 관절 속도

| command.joint_pos_deg | 18-vector / degree | 명시적으로 발행한 관절 목표

| command.grasp_state | scalar: 0 hold / 1 release / 2 grasp | 고수준 grasp 동작

| command.grasp_mode_id | profile-aware scalar / unspecified sentinel | grasp 방식 선택

| command.grasp_force | scalar / 장치 force 설정값 | 요청한 grasp force; 실측 접촉력과 구별

| timestamp / valid | 기록 시간·신호 유효성 | 샘플과 source 상태 해석

Feedback만 저장하면 손이 어떤 모양이었는지는 알 수 있지만, 그 모양을 만들기 위해 어떤 target을 보냈는지는 분리하기 어렵습니다. 새 수집에서는 command.joint_pos_deg도 보존하도록 hand teleop, capture worker와 capture plan을 연결했습니다. Mode·force·grasp 상태도 raw에만 남기지 않고 이후 변환이 읽을 수 있는 계약으로 만들었습니다.

Grasp force는 사람이 또는 runtime이 설정한 commanded force입니다. 물체 접촉면에서 측정한 실제 힘을 Newton 단위로 복원한 값이 아닙니다. 이 값을 action으로 넣으면 명령된 grasp 행동을 모방할 수 있지만, 측정 force·tactile 입력이 없는 상태에서 접촉력을 직접 관측하는 policy가 되는 것은 아닙니다.

기록 sample의 시간과 개별 장치의 마지막 feedback·command 시각을 함께 봐야 합니다. 한 HDF5 행에 나란히 있다고 각 센서가 정확히 동시에 측정했거나 같은 순간에 모든 명령이 실행된 것은 아닙니다. Camera timestamp·valid와 sidecar RGB도 hand 관절 stream과 다른 source이므로 별도 연결 관계를 유지했습니다.

### 2.2 Explicit Command vs Legacy Feedback Fallback

기존 raw에는 feedback 관절과 grasp 명령은 있지만 command.joint_pos_deg가 없는 파일이 있었습니다. 새 schema만 강제하면 이미 수집한 데이터를 전부 버려야 했습니다. 반대로 관측값을 언제나 명령처럼 쓰면 target의 출처가 모호해집니다. 그래서 명시적 joint command를 우선하고, 없는 구형 파일에서만 기록된 feedback을 joint action으로 사용하는 호환 경로를 추가했습니다.

target source 선택
| 조건 | 선택한 joint target | 의미

| command.joint_pos_deg 존재 | 발행한 joint command | 명령 target을 직접 학습

| command 없음, 필요한 feedback·metadata 존재 | 같은 기록 sample의 feedback joint | 수행된 motion을 따라가는 legacy 근사

| 소속 metadata 없음 / joint 폭 불일치 | 변환 실패 | 좌우·관절 의미를 추측해 채우지 않음

| 선택한 grasp 명령 stream 없음 | 변환 검증에서 오류 | joint fallback으로 mode·force까지 만들지 않음

현재 이 fallback은 같은 시점의 feedback 배열을 사용합니다. 기록되지 않은 target을 정확히 복원하거나 다음 시점의 정답을 새로 얻어낸 것은 아닙니다. 구동 지연과 추종 오차가 feedback에 포함될 수 있으므로 explicit command와 같은 의미로 평가하면 안 됩니다. 전처리 시 fallback 여부를 구분해 두고 raw key와 변환 경로를 함께 추적할 수 있게 했습니다.

비활성 손을 0 target으로 채우거나 반대 손 값을 복사하지 않았습니다. 0도 실제 관절 명령으로 해석되기 때문입니다. 현재 pose를 유지하는 hold와 새 명령을 발행하는 사건을 구분하고, 선택한 owner에 대해 존재하는 데이터와 요구한 출력만 연결했습니다.

### 2.3 Canonical Schema & Previous-Command Context

학습용 key의 의미
| canonical key | 값의 출처 | 역할

| observation.hand.<side>.joint_pos_deg / joint_vel_deg_s | 로봇 핸드 feedback | 현재 상태

| action.hand.<side>.joint_pos_deg | 명시 command 또는 legacy fallback | 이번 step의 joint target

| action.hand.<side>.grasp_state / grasp_mode_id / grasp_force | raw grasp command | 이번 step의 primitive

| observation.prev_hand_command.<side>.grasp_* | canonical grasp action을 한 step 이동 | 직전 명령 context

| observation/action.robot.<key>.hand.* | robot-keyed raw와 owner metadata | 독립 로봇 소속 보존

[그림: Figure 3. 현재 관절 feedback, 이번 명령, 직전 명령은 서로 다른 값입니다. 표의 t는 설명용 sample index이며 실제 동작 기록이 아닙니다. 첫 학습 행의 previous-command는 첫 command를 반복하는 경계 규칙을 사용합니다.]

Figure 3. 현재 관절 feedback, 이번 명령, 직전 명령은 서로 다른 값입니다. 표의 t는 설명용 sample index이며 실제 동작 기록이 아닙니다. 첫 학습 행의 previous-command는 첫 command를 반복하는 경계 규칙을 사용합니다. 크게 보기 ↗

c0=u0ct=ut−1,1≤t<T길이 T의 명령 u에서 previous-command 관측을 생성하는 경계 규칙
관절만으로는 지금 어떤 grasp mode나 force 설정 아래 움직였는지 드러나지 않을 수 있습니다. 그래서 이전 grasp 명령을 context로 넣고 현재 명령을 target으로 분리했습니다. 학습에서는 첫 행을 제외하고 현재 target을 그대로 input에 복사하지 않습니다. 첫 행은 이전 sample이 없어서 첫 값을 반복하며, 이 경계 처리와 runtime 시작 context의 초기화는 별도로 해석해야 합니다.

Runtime에서는 직전 실행 명령을 owner별로 유지해 다음 observation에 사용합니다. 이는 telemetry에서 읽은 물리 상태가 아니라 명령 이력입니다. 이름에도 prev_hand_command를 사용해 두 source를 섞지 않았습니다.

### 2.4 Grasp Mode −1: Persistence and No-Op Semantics

[그림: Figure 4. 알려진 mode를 보존하는 capture 수정과, mode를 모르는 상태를 허용하는 schema 수정은 다른 문제를 해결합니다. Replay가 움직였다는 사실만으로 mode 기록이 올바르다고 판단하지 않았습니다.]

Figure 4. 알려진 mode를 보존하는 capture 수정과, mode를 모르는 상태를 허용하는 schema 수정은 다른 문제를 해결합니다. Replay가 움직였다는 사실만으로 mode 기록이 올바르다고 판단하지 않았습니다. 크게 보기 ↗

Home에서 대기하다 grasp한 데이터가 학습 변환에서 막혔습니다. 당시 raw 검사에서는 양손 mode stream이 전체 314 sample 동안 −1이었고, grasp_state와 force는 존재했습니다. 처음에는 mode가 저장되지 않은 source 문제로만 봤지만, Replay가 동작한다는 관찰과 Data Collect 우측 End Effector에서 조작했다는 조건을 대조하면서 경로를 나눠 확인했습니다.

Move Robot의 explicit mode 명령은 backend의 last-command state를 갱신합니다. 반면 gesture mapping 설정은 “다음 gesture에 사용할 mode”의 설정이며 즉시 동일한 mode 명령을 발행했다는 뜻은 아닙니다. Release·force 갱신이 기존 유효 mode를 지우는 경로도 있었습니다. 마지막 유효 mode를 유지하고 capture에서 last_mode_set까지 확인하도록 수정했습니다.

그것만으로는 idle 데이터의 정상적인 −1을 설명할 수 없었습니다. 한 번도 mode를 정하지 않았다면 −1은 unsupported positive mode가 아니라 명시적인 mode 변경 없음입니다. Profile-aware normalization에서 비양수 값을 unspecified sentinel로 받아들이고, 추론에서는 set_grasp_mode만 건너뛰도록 의미를 맞췄습니다. 유효 mode를 알 때는 유지하되, 모르는 mode 31을 추측해 만들어 넣지는 않습니다.

Replay는 feedback joint와 force·grasp/release를 사용하면서 비양수 mode를 건너뛸 수 있었습니다. 따라서 기존 장치 mode가 유지돼 겉보기 동작이 나와도, 특정 mode가 raw에 기록되거나 새로 재생됐다는 증거는 아니었습니다. 저장 상태 보존과 sentinel 해석을 각각 수정해야 학습과 실행의 의미가 일치했습니다.

## 3. 학습과 checkpoint 계약

### 3.1 Training Mapping & Owner-Specific Selection

Backend schema에 hand key가 생긴 뒤에도 Training 화면에서는 joint·pose·gripper만 보이고 action 쪽에 Progress와 Pad만 남는 문제가 있었습니다. 데이터가 없다고 단정하기 전에 schema 응답과 frontend 목록 생성 코드를 비교했습니다. 원인은 buildInputItems/buildOutputItems가 hand와 prev_hand_command 계열을 목록에 추가하지 않는 것이었습니다.

Observation의 hand position·velocity와 previous command, action의 joint target·grasp primitive를 각각 UI에 노출하고 ordering에도 hand 그룹을 추가했습니다. Key가 존재하는 것과 사용자가 실제로 선택할 수 있는 것은 별개의 경계였습니다. Progress·padding 같은 보조 필드를 하드웨어의 action 성분으로 세지도 않았습니다.

선택과 충돌을 정리한 단위
| 선택 | 처리 기준

| 왼손만 / 오른손만 | 선택한 owner의 입력·출력과 현재 attachment 연결

| 양손 | 양쪽 계약·관측·명령을 각각 검증

| 왼쪽 gripper + 오른쪽 hand | 서로 다른 segment이므로 허용

| 같은 segment의 gripper + hand 출력 | 같은 소유 대상의 경쟁 명령으로 차단

| 팔 observation만 있고 팔 action 없음 | 상태를 입력했다고 팔 명령이 학습되지는 않음

특히 IDLE에서 Motion Control로 팔을 움직인 파일은 proprio 상태만 남고 teleop action source가 없을 수 있었습니다. 오른팔 observation을 선택해도 control.right.teleop_command가 없으면 팔 출력 정답이 생기지 않습니다. 이후 split teleop command와 로봇 metadata 저장도 보강했지만, 이미 기록되지 않은 명령을 관측값만 보고 복구한 것은 아닙니다.

### 3.2 Hand-Only Training Without RGB or Arm Tasks

Idle 상태에서 손만 움직여 수집한 데이터도 학습해야 했습니다. 기존 readiness가 RGB를 필수로 가정하거나, 팔 task-space 출력을 고르지 않았는데도 task control mode를 요구하면 손 관절·명령만으로는 시작할 수 없었습니다.

Hand-only state 입력을 허용하도록 RGB gate를 정리하고, 선택한 output에 task pose가 없으면 joint control mode로 해석하도록 training service와 flow를 맞췄습니다. 해결된 control_mode도 metadata에 남겨 체크포인트를 다시 불러올 때 같은 실행 조건을 사용할 수 있게 했습니다.

당시 synthetic hand-only smoke에서는 cameras=[]로 readiness를 통과하고 training completion, checkpoint load, hand output split까지 확인했습니다. 이 검사는 카메라 없는 소프트웨어 경로를 확인한 것입니다. 실제 수집 데이터 학습과 실물 핸드 실행은 뒤의 검증 단계에서 따로 확인했습니다.

### 3.3 Checkpoint Contract: More Than Model Weights

학습 산출물에 함께 남긴 정보
| 정보 | 배포에서 필요한 이유

| 입력·출력 owner와 선택 key | 모델이 어느 손을 관측·제어하는지 확인

| profile_id / joint_count | 현재 attachment와 벡터 의미 비교

| 입출력 순서·shape·normalizer | tensor 조립·분할·단위/scale 복원

| resolved control_mode / camera 목록 | hand-only와 arm+hand 실행 조건 유지

| robot_hand_contract / robot-keyed EE 정보 | 임시 runtime 주소와 분리된 요구사항

선택한 hand key와 episode metadata에서 필요한 side·profile·joint count를 계산하고, preprocessing artifact, run manifest, training metadata와 bundle checkpoint의 모델 정보로 이어갔습니다. 모델 weight만 저장하면 새로 연결한 장치가 학습 때와 같은지 알 수 없기 때문입니다.

Checkpoint는 정답 데이터 자체가 아닙니다. 학습 정답은 dataset의 action chunk이고, checkpoint는 그 관계를 학습한 weight와 실행에 필요한 설정·통계·계약입니다. 추론에서는 live observation을 넣어 새로운 action을 예측합니다. 이 구분이 있어야 60차원 “기대 정답”과 체크포인트 정보를 혼동하지 않습니다.

## 4. ACT 표현과 혼합 출력

### 4.1 ACT: Chunk Learning and the MiMicX Extension

[그림: Figure 5. ACT의 CVAE·chunk 학습 원리와 MiMicX의 task pose/hand 출력 경계를 함께 그렸습니다. Demonstration chunk는 학습용 latent encoder에만 들어가고 추론에는 주어지지 않습니다.]

Figure 5. ACT의 CVAE·chunk 학습 원리와 MiMicX의 task pose/hand 출력 경계를 함께 그렸습니다. Demonstration chunk는 학습용 latent encoder에만 들어가고 추론에는 주어지지 않습니다. 크게 보기 ↗

ACT는 한 action 대신 여러 미래 action을 chunk로 예측합니다. 학습 시 state와 demonstration chunk로 latent 분포를 만들고, 관측 특징과 latent를 사용해 action sequence를 복원합니다. 추론에서는 demonstration encoder를 쓰지 않고 prior의 평균 z=0을 사용합니다. 이 기본 원리는 ACT 원 논문과 공식 구현을 따릅니다.[H1][H2]

여기서 양팔 Cartesian task pose, Tesollo joint와 grasp key를 같은 ordered action layout에 연결한 것은 MiMicX 통합 작업입니다. 회전 6D 표현은 ACT라는 이름 자체의 고정 입출력 규격이 아닙니다. 이 task-space backend가 회전행렬을 신경망 출력으로 다루기 위해 사용하는 표현입니다.

L=1BHD∑b,t,d|âbtd−abtd|+βDKL(q(z)‖p(z))현재 학습 경로: 복원 action의 평균 L1 + VAE 사용 시 latent KL 항
B는 batch 수, H는 chunk 길이, D는 loss 비교 시의 action 폭입니다. 정규화된 target과 복원된 prediction이 같은 순서·의미·폭이어야 L1을 계산할 수 있습니다. β는 latent regularization 가중치이며, VAE를 사용하지 않으면 해당 항은 없습니다. 손 출력이 사라진 문제는 학습률이나 GPU 사용량보다 이 비교 경계부터 확인해야 했습니다.

### 4.2 Why Six Rotation Values Become a 3×3 Matrix

회전은 물리적으로 3자유도지만 표현에 쓰는 숫자 수는 달라질 수 있습니다. Euler angle은 3개, quaternion은 4개, 이 backend의 연속 회전 표현은 6개, 회전행렬은 9개입니다. 숫자 수가 커진다고 로봇 관절이 늘어나는 것이 아닙니다. Zhou 등의 6D 표현은 신경망 회귀에 적합한 연속 표현과 회전행렬 복원을 다룹니다.[H3][H4]

x=a‖a‖z=x×b‖x×b‖y=z×x,R=[x,y,z]두 3-vector a,b에서 구현이 회전축을 복원하는 순서
x를 정규화하고 x와 b의 외적으로 z를 만든 뒤, z×x로 y를 얻습니다. 정상적인 비공선 입력에서는 세 축이 직교하는 오른손 회전행렬이 됩니다. 구현은 norm의 작은 분모에 10⁻⁸ 하한을 두지만, 퇴화한 0 벡터나 평행 벡터가 항상 유효한 회전을 만든다는 뜻은 아닙니다. R의 열을 어떤 순서로 6D에 넣는지도 복원 함수와 같아야 합니다.

학습의 CVAE encoder에 target을 넣을 때는 3×3 target 행렬의 첫 두 열을 연속된 3-vector로 묶습니다. Flatten된 행렬에서 단순히 앞 6개 숫자를 잘라 쓰면 행/열 순서가 달라질 수 있으므로, matrix→6D와 6D→matrix의 왕복 순서까지 맞췄습니다. Hand tail은 이 회전 변환의 대상이 아닙니다.

### 4.3 Investigating 24 vs 60: Follow the Tensor Boundary

양팔 relative-delta task pose와 양손 joint를 출력으로 선택한 뒤 Start Training에서 “Failed to fetch”가 보였고, backend 로그에는 The size of tensor a (24) must match the size of tensor b (60)이 남았습니다. Frontend 통신 문제처럼 보이는 증상과 실제 학습 예외를 나누고, loss 직전 prediction과 batch action을 대조했습니다.

해당 학습 사례의 action 표현
| 위치 | 회전 | 양손 joint | 합계

| 내부 head: 양팔 위치 6 | 각 팔 6D ×2 =12 | 18×2 =36 | 54

| 복원한 비교 표현: 양팔 위치 6 | 3×3 행렬 ×2 =18 | 18×2 =36 | 60

| 오류 경로: 양팔 위치 6 | 행렬 18 | 유실 | 24

NURI 양팔의 관절은 6+6=12 DOF입니다. 하지만 여기의 팔 18은 joint angle 18개가 아니라 양팔 위치 6개와 회전 표현 12개를 이어 붙인 task action 벡터입니다. 복원 뒤 팔 24도 위치 6개와 행렬 원소 18개의 합입니다. Observation 폭과 action 폭이 달라서 난 오류가 아니라, 같은 action을 loss에서 비교할 때 prediction의 손 부분이 사라진 오류였습니다.

출력 설정에 orientation [6]이 보이고 target tensor에서는 [9]가 되는 것은 이 경로에서 정상입니다. 원인은 dataset에서 손이 빠진 것도, 체크포인트 파일이 24차원 정답을 요구한 것도 아니었습니다. Task pose 복원이 반환한 팔 부분만 이후 경로에 남겼기 때문에, 원래 head 뒤에 있던 손 36개가 전달되지 않았습니다.

### 4.4 Restore the Pose Prefix, Preserve the Non-Pose Tail

[그림: Figure 6. 해당 사례의 내부 layout과 복원 layout입니다. 구간은 [시작:끝)이며 hand tail은 회전 복원 뒤 값·순서를 유지한 채 다시 연결됩니다. 모든 checkpoint에 고정된 54/60 규격을 뜻하지 않습니다.]

Figure 6. 해당 사례의 내부 layout과 복원 layout입니다. 구간은 [시작:끝)이며 hand tail은 회전 복원 뒤 값·순서를 유지한 채 다시 연결됩니다. 모든 checkpoint에 고정된 54/60 규격을 뜻하지 않습니다. 크게 보기 ↗

Dinternal=9n+d,Drestored=12n+dn개 task pose와 d개 non-pose 값: 내부와 복원 폭
Task 위치 3n과 회전 6n으로 pose prefix 길이를 계산하고, 나머지를 non-pose tail로 분리했습니다. Prefix만 decode_6d_action_head에 넣어 위치와 회전행렬을 복원한 뒤 tail을 concat했습니다. 이 사례에서 n=2, d=36이므로 내부 54개가 복원 60개가 됩니다. Hand·gripper·기타 scalar를 “dual-arm이면 뒤에 필요 없다”는 조건으로 제거하지 않도록 바꿨습니다.

restore(a)=concat(decode(a[0:18]),a[18:54])해당 54-vector의 의미를 유지하는 복원
수정은 training forward와 inference select_action 두 곳에 적용했습니다. Training만 고치면 loss는 계산돼도 실행 시 손 action이 다시 사라질 수 있기 때문입니다. Target chunk를 CVAE encoder의 내부 표현으로 바꿀 때도 pose 뒤의 tail을 유지해 모델 안팎에서 같은 출력 구성을 다루도록 했습니다.

Target을 24개로 잘라 loss를 통과시키는 방법은 선택한 손 제어를 학습에서 없애 버립니다. 60개로 0-padding하는 것도 손 값의 의미를 복원하지 못합니다. 필요한 수정은 shape를 맞추는 것이 아니라 처음 선택한 손 출력이 변환 전후에 살아 있게 하는 것이었습니다.

### 4.5 Regression: Training Forward and Action Selection

재발 검사는 양팔 task pose와 양손 18-joint 출력으로 policy를 구성하고, 카메라 없이도 수행할 수 있는 state 입력을 사용했습니다. Batch B=2, horizon H=3에 대해 target 회전은 identity 행렬로 주고 forward 결과가 (2,3,60)인지, reset 후 select_action의 마지막 폭도 60인지 확인하는 검사를 추가했습니다.

회귀 검사와 실제 실행이 확인하는 것
| 검사 | 확인하는 경계

| forward loss + shape | 학습 중 pose 복원 뒤 손 tail 유지

| reset 후 select_action | 추론 출력에서도 같은 layout 유지

| 동일 실제 데이터 학습 완료 | 수집 데이터·mapping·loader·학습 실행 연결

| checkpoint + live hand 실행 | 실시간 입력 조립과 물리 명령 경로 연결

Shape 회귀 검사는 task pose와 hand를 섞은 경로가 손실 없이 연결되는지를 확인합니다. 이것만으로 모든 손 target 값이나 실제 조작 성능이 검증된 것은 아닙니다. 당시 수정 후 동일 데이터로 학습을 완료하고, 별도로 체크포인트를 적용해 실제 Tesollo 핸드의 추론 실행과 움직임을 확인했습니다.

## 5. 실시간 추론과 핸드 제어

### 5.1 Live Observation: Contract Support Must Supply a Tensor

학습 후 추론을 실행하자 hand observation을 인식하지 못해 출력이 나오지 않았습니다. 문제는 두 곳이었습니다. 추론 입력 조립에 Tesollo telemetry가 들어가지 않았고, preprocessor도 observation.hand.<side>.joint_pos_deg·joint_vel_deg_s를 직접 tensor로 처리하지 않았습니다.

현재 로봇에 소속된 robot hand의 telemetry를 조회해 canonical hand key로 control 입력에 합치고, inference data source가 이 경로를 사용하도록 연결했습니다. Preprocessor에는 hand key를 직접 읽는 분기를 추가하고, 지원하지 않는 공통 처리 경로로 빠지지 않게 했습니다. 그 다음 required key·expected shape 검사를 통과시킵니다.

Joint key는 degree·degree/s라는 의미를 유지한 채 tensor로 만들고, 학습 때 저장한 normalizer와 key 순서를 적용합니다. Arm qpos에 적용하는 degree→radian 처리를 이름만 비슷하다는 이유로 hand field에 중복 적용하지 않았습니다. 관측이 없을 때 임의의 0 관절로 실행시키기보다 어떤 live key가 없는지 시작 검사에서 드러나게 했습니다.

Previous-command observation은 이 telemetry 합치기와 별도로 owner별 실행 이력에서 채웁니다. 실제 관절 상태와 직전 mode·force·state가 각각 다른 경로로 들어온다는 점까지 연결해야 학습 때 구성한 observation을 실행 시에도 재현할 수 있었습니다.

### 5.2 Deploy Compatibility and Exact Target Resolution

체크포인트와 현재 장치의 대조
| 불일치 | 처리 이유

| 필요한 side / robot owner 없음 | 다른 owner로 우회해 보내지 않음

| 같은 side 중복 attachment | 정확한 물리 target을 결정할 수 없음

| profile / joint count 불일치 | 같은 길이나 유사 이름만으로 동일 장치라 할 수 없음

| 같은 owner의 gripper·hand 출력 충돌 | 서로 다른 actuator 명령의 경쟁 방지

| live hand 필수 관측 없음 | tensor 구성을 만족하지 못하므로 시작 검사에서 오류

Deploy 전에 모델의 핸드 계약을 현재 runtime과 비교하고, dispatch 직전에도 loaded checkpoint와 matched hand의 profile·관절 수를 다시 확인했습니다. 모델 load 뒤 configuration이 바뀔 수 있으므로 한 번의 검사만 믿지 않았습니다.

양팔 좌우 target은 side가 정확히 맞는 attachment를 고릅니다. 여러 single-arm 로봇에서는 먼저 robot_key로 owner를 결정하고 그 로봇의 hand를 찾습니다. 단일 arm/default에서 유일한 attachment를 다루는 호환 경로와, left/right 중 임의의 첫 장치를 고르는 방식은 구분했습니다.

### 5.3 Joint Target vs Grasp Primitive Arbitration

[그림: Figure 7. 같은 step의 joint target과 grasp primitive를 경쟁시키지 않고, 모든 선택 hand의 preflight 뒤 명령을 보냅니다. 전송 실패 시 후속 명령을 멈추며 이미 보낸 명령을 되돌리는 transaction은 아닙니다.]

Figure 7. 같은 step의 joint target과 grasp primitive를 경쟁시키지 않고, 모든 선택 hand의 preflight 뒤 명령을 보냅니다. 전송 실패 시 후속 명령을 멈추며 이미 보낸 명령을 되돌리는 transaction은 아닙니다. 크게 보기 ↗

Command builder는 복원 action을 canonical key별로 나누고 owner별 joint_target·grasp_state·mode·force를 구성합니다. Grasp state와 mode처럼 이산 의미를 가진 scalar는 runtime에서 정수 값으로 해석하고 profile의 지원 범위를 검사합니다. 임의의 회귀 출력이 어떤 mode로든 자동 정당화되는 것은 아닙니다.

grasp_state가 1(release) 또는 2(grasp)이면 같은 owner의 joint target을 제거하고 primitive를 우선합니다. Explicit mode가 있으면 profile에 맞는 vendor mode로 변환해 설정하고, force가 있으면 설정한 뒤 release/grasp를 보냅니다. Mode가 unspecified이면 mode 설정만 건너뜁니다. Grasp state가 hold이면 joint target이 존재할 때 joint_move_to로 관절 pose를 실행합니다.

Joint target은 profile의 관절 수·범위를 검증하고 clamp한 뒤 motion_time_ms와 함께 backend로 보냅니다. 반복되는 grasp 상태는 mode·force·동작이 변했는지 확인해 불필요한 전송을 줄입니다. 현재 관절과 target의 최대 차이가 0.5° 이하인 경우에도 redundant move를 생략하는 runtime 조건을 사용합니다. 이 숫자는 실행 코드의 판정값이며 물리 정확도를 측정한 수치가 아닙니다.

### 5.4 Preflight, Fail-Fast & Observable Runtime Errors

양손 중 한쪽의 설정이 잘못됐는데 다른 쪽부터 움직이는 일을 줄이기 위해, step의 모든 hand command에 validate_only를 먼저 적용했습니다. 이 단계에서 target·계약을 만족하지 못하면 명령 전송 전에 해당 step을 중단하고 target과 이유를 기록합니다.

전송 중 실패가 나면 뒤의 hand command를 더 보내지 않고 run을 멈추며 last_error·runtime_error와 robot_hand_dispatch_failed 사유를 남겼습니다. Mode→force→grasp/release 중 어디까지 적용됐는지도 결과에 보존합니다. 한쪽이 이미 움직인 뒤 다른 하드웨어에서 오류가 나는 상황을 원자적으로 되돌리는 기능은 아니므로, preflight와 전송 후 실패 처리는 서로 다른 역할입니다.

이 구조는 핸드의 접촉 성공을 센서로 확인한 뒤 다음 action을 허용하는 gate가 아닙니다. 이 작업에서 확인한 것은 정확한 owner로 명령이 전달되는지, backend가 성공·실패를 어떻게 보고하는지, 실패를 runtime이 조용히 무시하지 않는지입니다.

## 6. 문제해결과 설계 판단

### 6.1 Troubleshooting by the First Broken Boundary

[그림: Figure 8. 겉으로 비슷한 “손이 안 움직임”을 raw 저장, 학습 UI, action 복원, live 입력과 명령 의미로 나누었습니다. 각 사례는 서로 다른 조건과 수정 경로를 가집니다.]

Figure 8. 겉으로 비슷한 “손이 안 움직임”을 raw 저장, 학습 UI, action 복원, live 입력과 명령 의미로 나누었습니다. 각 사례는 서로 다른 조건과 수정 경로를 가집니다. 크게 보기 ↗

진단 순서는 source inventory→canonical schema→선택 key→batch tensor→복원 output→live observation→runtime route였습니다. 한 단계가 정상처럼 보여도 다음 경계에서 값이나 의미가 빠질 수 있었습니다. UI의 Failed to fetch는 loss의 24/60 예외로, 빈 mapping은 frontend key filter로, inference 입력 오류는 telemetry 조립과 preprocessor로 좁혀졌습니다.

모든 증상을 한 번에 “데이터가 잘못됐다”거나 “모델이 학습을 못 한다”로 묶으면 이미 정상인 부분을 다시 고치게 됩니다. 실제 입력·출력과 실패 위치를 먼저 확인하고, 이전 수정이 무엇을 해결했고 무엇은 그대로 남겼는지 분리해 다음 변경을 정했습니다.

### 6.2 Verification Across Software, Training & Hardware

단계별 확인과 결과
| 단계 | 확인한 내용 | 결과 해석

| Schema / conversion | owner·joint 폭·mode sentinel·legacy target | 의미가 일치하는 학습 key로 변환

| UI / state-only smoke | hand key 선택·RGB 없는 학습·checkpoint load·output split | 소프트웨어 경로 연결

| ACT regression | forward와 select_action 모두 60개 유지 | 혼합 output 손 tail 유실 경로 보강

| Live input 검사 | backend telemetry→canonical hand tensor | 체크포인트가 요구한 관측 공급

| 실제 데이터 학습 | 수정 후 동일 데이터의 학습 완료 | 수집부터 학습 완료까지 연결

| 실물 추론 | 학습된 checkpoint로 Tesollo 실행·움직임 확인 | live inference와 하드웨어 명령 경로 연결

검증은 한 번의 통과 로그로 묶지 않았습니다. 회귀 검사는 코드의 출력 경계, 학습 완료는 실제 데이터 경로, 실물 움직임은 observation과 dispatch 연결을 확인합니다. 이 사례에 물체 조작 성공률이나 접촉력 추종 오차 같은 별도 실험값을 추가하지 않았습니다.

초기 state-only smoke와 live-input 수정 당시에는 실물 확인이 아직 분리돼 있었습니다. 이후 동일 데이터 학습 완료와 실제 핸드 추론 실행을 확인한 결과를 최종 흐름에 연결했습니다. 아직 직접 작성하지 않은 영상별 평가나 실험 버전 비교는 이 보고서에서 새로 만들지 않았습니다.

### 6.3 Engineering Note

기능을 확장할 때는 기존 코드가 전제한 데이터 구조부터 확인해야 한다는 걸 배웠습니다. 팔의 회전만 복원하면 된다는 전제는 gripper 위주 구성에서는 드러나지 않았지만, 손 36개를 붙이자 출력 유실로 나타났습니다. Tensor를 단순한 숫자 배열이 아니라 owner·단위·명령 의미가 있는 layout으로 보게 됐습니다.

24와 60을 같게 만드는 일과 손 동작을 되살리는 일은 달랐습니다. Target을 자르거나 빈 값을 채우면 오류 메시지는 없앨 수 있지만, 제가 선택한 제어를 없애는 수정이 됩니다. 변환 전후에 무엇이 보존돼야 하는지 먼저 정해야 올바른 수정을 판단할 수 있다는 점을 체감했습니다.

Mode −1 문제에서는 엄격한 검증도 의미를 잘못 정하면 정상 데이터를 막는다는 걸 배웠습니다. Unknown을 임의 mode로 채우는 대신 “변경 없음”을 모델링하니, 알려진 상태를 보존하는 문제와 아직 모르는 상태를 허용하는 문제를 나눌 수 있었습니다. 오류를 막는 규칙보다 먼저 값의 상태와 생애주기를 정의해야 했습니다.

마지막으로 체크포인트가 지원한다고 선언한 입력도 실제 telemetry가 tensor까지 오지 않으면 사용할 수 없었습니다. 계약을 저장하는 것과 계약을 실행 경로에서 만족시키는 것은 별도의 구현 과제였습니다. 학습·추론·실물 실행을 각자 확인한 이유도 여기에 있습니다.

## References

- [H1] Zhao et al. — Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware (RSS 2023)
ACT 원 논문. MiMicX의 Tesollo schema·task pose 복원은 별도 통합 구현입니다.

- [H2] Tony Zhao — Official ACT implementation
CVAE·action chunk·학습 objective의 공식 구현 참고.

- [H3] Zhou et al. — On the Continuity of Rotation Representations in Neural Networks (CVPR 2019)
연속 6D 회전 표현과 직교화의 원리.

- [H4] RotationContinuity — Author implementation
논문 저자의 회전 표현 구현. 본문의 축 순서는 MiMicX helper와 대조했습니다.

- [H5] Tesollo — DG-4F
공식 제품 사진·장치 설명. 제품 사양을 이번 학습의 성능 측정값으로 사용하지 않습니다.

CONTINUE READING

## Related Records

System Overview

### 플랫폼 개요

장치·session·수집·전처리·학습·배포의 전체 구조와 상태 소유권, 데이터·모델 계약을 설명합니다.
↗

Technical Report

### ACT Temporal Ensembling

ACT 추론에서 겹치는 action chunk를 처리하는 Temporal Ensembling을 런타임에 연결했습니다.
↗

Technical Report

### Diffusion Policy 연동

Diffusion Policy를 기존 모델 선택·학습·checkpoint·실행 구조에 통합했습니다.
↗

Technical Report

### Robot Replay·안전 로직

HDF5 기록을 로봇에서 재생하고, 초기 자세 정렬과 본 재생을 분리했습니다.
↗

Technical Report

### 독립 다중 로봇 지원

독립된 Indy12 두 대의 session·소유권·raw schema를 설계하고 수집·학습·추론·시각화·Replay까지 연결했습니다.
↗
