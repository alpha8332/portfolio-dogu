# 외부 모델 실행 연동 — SCDP · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/mimicx/external-model.html

TECHNICAL REPORT

# 외부 모델 실행 연동 — SCDP

연구팀의 SCDP 모델을 MiMicX에서 실행: 16D rotvec adapter·입출력 계약·좌표 변환과 실로봇 확인.

Model IntegrationRobot ControlDiagnostics

MY ROLE
연구팀 제공 모델 연동 · 16D 좌표 변환 adapter 구현 · 실로봇 검증

DOCUMENT
Technical Report

연구팀이 제공한 SCDP 학습 결과물을 MiMicX에서 rollout하기 위해 실행 환경·관측·출력 계약을 맞췄습니다. 22D wrapper와 16D rotvec action의 불일치를 해결한 adapter 구현, 좌표 변환과 실로봇 실행 확인을 상세히 설명합니다.

## 1. 연구 모델과 연동의 전제

### 1.1 연구팀 모델을 MiMicX의 실제 실행에 연결

KAIST 연구팀이 학습해 전달한 SCDP 결과물을 기존 MiMicX의 External Bundle 경로에서 실행했습니다. 제가 맡은 일은 실행 환경과 입력·출력의 의미를 맞추고, 모델과 wrapper의 불일치를 조사해 adapter를 수정한 뒤 실제 로봇에서 변환된 명령이 동작하는지 확인하는 일이었습니다.

16D 출력에 맞게 gripper·left·right 구간을 다시 정의하고 torso mapping을 제거했습니다. 양팔의 위치·rotation-vector 변화량은 현재 pose 기준의 절대 pose6로 변환해 기존 Robot API 경로를 사용하도록 구현했습니다. SCDP의 설계·학습·논문 성능 평가는 연구팀이 담당했고, 연구용 텔레오퍼레이션 데이터 수집 지원은 별도 업무로 남겼습니다.

SCDP 연구 지원 — 텔레오퍼레이션 데이터 수집 →

### 1.2 SCDP가 카메라·상태·좌표 정보를 함께 요구하는 이유

[그림: SCDP 원 논문 Figure 2: 다중 해상도 특징, 궤적 기반 공간 조건화, 반복 action denoising]

Kim 등, SCDP 원 논문 Fig. 2 (arXiv v2). 저자 원본 그림을 변경 없이 사용했습니다. CC BY 4.0. 모델 구조이며 제가 개발한 플랫폼 adapter 구조와는 구분됩니다. 크게 보기 ↗

SCDP는 중간 action 궤적으로 앞으로의 EE 위치를 재구성하고 영상에 투영해, 다중 해상도 feature map에서 해당 위치의 특징을 읽습니다. 그 공간 context와 로봇 상태로 action을 denoise하며, 다음 denoising 단계에서는 바뀐 궤적으로 다시 특징을 고릅니다. RGB encoder의 계산과 반복마다 갱신되는 공간 조건화가 다르다는 점이 핵심입니다.[SCDP]

따라서 영상 shape만 맞춰서는 충분하지 않습니다. 현재 EE 상태, action delta, 카메라 투영이 같은 좌표·길이 단위를 사용해야 합니다. 공개 공식 구현도 state·action·calibration의 frame과 단위 일치, 실제 로봇 제어의 별도 통합을 명시합니다. 아래는 전달받은 로컬 bundle을 MiMicX에 맞춘 기록이며 공개 최신 구현과 같은 revision이라는 뜻은 아닙니다.[SCDP-CODE]

그림 출처와 재사용 조건은 원 논문 및 CC BY 4.0을 따릅니다.[SCDP][CC-BY]

### 1.3 PSF 파라미터 전달과 움직이는 head-camera 좌표

[그림: Head-camera의 고정 변환과 로봇 자세에 따른 base-head 변환을 합성하고, 투영에는 반대 방향 변환을 사용합니다. 실제 calibration 수치나 초기 관절 자세는 포함하지 않았습니다.]

Head-camera의 고정 변환과 로봇 자세에 따른 base-head 변환을 합성하고, 투영에는 반대 방향 변환을 사용합니다. 실제 calibration 수치나 초기 관절 자세는 포함하지 않았습니다. 크게 보기 ↗

PSF UI에서 head-camera extrinsic·intrinsic과 초기 관절 자세를 확인·추출해 연구자에게 전달했습니다. 새 calibration 알고리즘을 만들거나 센서로 다시 측정한 업무는 아닙니다. 머리가 움직이면 고정된 head-camera 행렬 하나만으로 base 기준 카메라 위치를 설명할 수 없어 좌표 관계도 함께 전달했습니다.

Tb←c=Tb←hTh←c좌표 변환: camera → head → base
여기서 T의 위첨자 a←b는 b 좌표를 a 좌표로 옮기는 행렬로 정의합니다. 원본의 Thc·Tbh·Tbc 명칭만으로 방향을 추정하지 않고, 투영할 때에는 합성한 camera→base 행렬의 역행렬로 base의 점을 camera 좌표로 옮겨야 합니다.

Pc=(Tb←c)−1Pbu=fxXcZc+cx,v=fyYcZc+cyBase의 점을 camera로 바꾸어 pixel에 투영
P는 동차좌표이고 Xc·Yc·Zc는 camera frame의 길이, fx·fy·cx·cy는 pixel 단위 intrinsic입니다. 물리 좌표의 길이 단위를 섞거나 transform 방향을 뒤집으면 action과 영상 anchor가 서로 다른 장소를 가리킵니다. 초기 joint 값도 숫자 목록뿐 아니라 torso·head·양팔의 순서 의미를 전달해야 했습니다.

## 2. Bundle과 observation 준비

### 2.1 Weight 하나가 아닌 실행 가능한 bundle

[그림: 기존 External Bundle framework의 역할과 제가 수정한 adapter 경계를 구분했습니다. Backend가 수집한 관측을 worker로 전달하고, 장치 명령은 다시 backend가 실행합니다.]

기존 External Bundle framework의 역할과 제가 수정한 adapter 경계를 구분했습니다. Backend가 수집한 관측을 worker로 전달하고, 장치 명령은 다시 backend가 실행합니다. 크게 보기 ↗

Bundle 구성과 역할
| 구성 | 담는 것 | 맞지 않을 때의 문제

| Manifest | adapter entrypoint·IO shape·mapping·device policy | 잘못된 slice·실행 대상·입력 해석

| Checkpoint / processors | weight·normalization·전후처리 설정 | load는 되지만 입력/출력의 스케일이 달라짐

| Adapter | 원 정책 load/infer/reset와 모델별 변환 | 정책 출력을 로봇 명령으로 잘못 번역

| Dependencies | policy code·LeRobot fork·torch/CUDA 관련 요구 | import 실패·CPU/GPU tensor 혼용

| Calibration | 입력 카메라·intrinsic·frame transform | 영상 projection과 상태 좌표 불일치

공통 runtime은 bundle을 발견하고 환경·입출력·실행 상태를 관리합니다. Adapter는 원 정책의 전후처리와 출력 표현 변환을 맡고 robot SDK나 task teleop 제어권을 소유하지 않습니다. 이 구조 전체를 새로 만든 것이 아니라, 기존 연결 지점에서 전달받은 모델과 실제 장치의 의미를 맞추었습니다.

### 2.2 의존성 준비와 실제 load를 나누기

연구용 checkpoint는 해당 policy 코드·processor와 맞는 Python·torch/CUDA 조합을 전제로 했습니다. 보존된 baseline bundle은 CUDA를 요구하고, checkpoint에 저장된 processor의 device를 CUDA로 맞춰 중간 CPU tensor가 섞이지 않도록 처리합니다. 단순히 weight를 GPU에 올리는 것만으로 전처리·후처리가 같은 device에 남는 것은 아닙니다.

Backend는 environment 설정·requirements·pip step 파일·editable metadata·adapter entrypoint/runtime version 등을 hash해 환경을 준비합니다. 폴더가 있다는 사실과 성공 ready marker가 있는 상태는 다릅니다. 설치 중단 뒤 남은 환경을 준비 완료로 보지 않도록 확인하는 경로입니다.

이 환경 hash는 checkpoint의 전체 내용 hash나 실행 bundle의 고유 ID와 같지 않습니다. 의존성이 같아도 weight·calibration·adapter 해석이 바뀔 수 있으므로 환경 재사용 여부와 실제로 어떤 모델을 load했는지는 따로 확인해야 합니다.

### 2.3 Inspect부터 Run·Stop까지 단계별로 확인

[그림: 환경·관측·변환·장치 mode를 서로 다른 단계에서 확인합니다. Preview only와 실제 dispatch 분기, 실패 시 조사 위치와 정리 경로를 나타냈습니다.]

환경·관측·변환·장치 mode를 서로 다른 단계에서 확인합니다. Preview only와 실제 dispatch 분기, 실패 시 조사 위치와 정리 경로를 나타냈습니다. 크게 보기 ↗

단계별로 확인하는 것
| 단계 | 확인하는 범위 | 다음 단계에 남는 질문

| Inspect | manifest·entrypoint·artifact·calibration·환경 정보 | dependency가 실제 import되는가

| Prepare Env | 준비 job과 성공 marker | 모델과 processor가 load되는가

| Mapping Preview | 현재 source·shape·sample·출력 target | 실제 정책 출력이 올바르게 변환되는가

| Dry Run / Load | adapter 확인 / persistent worker에 모델 상주 | 현재 장치 제어 mode가 준비됐는가

| Preview only | 추론과 command 후보 생성 | 실제 dispatch가 허용되는가

| Task Teleop / Run | 명시적 제어 준비 후 live tick·dispatch | 출력·명령·실물 상태가 의도와 맞는가

| Stop | loop 중단·소유 teleop route 정리 | reload/reset과 다음 실행 준비

이 단계들은 같은 성공을 반복해서 확인하는 것이 아닙니다. dependency import, 현재 입력 source, 숫자의 의미, 로봇 제어 mode는 실패 지점이 다릅니다. 모델 load와 로봇을 움직일 권한을 분리해야 점검 중 예기치 않은 동작을 막을 수 있었습니다.

### 2.4 Backend snapshot에서 정책 observation까지

Backend의 control pose·joint·gripper와 등록 카메라 frame을 입력 mapping으로 연결합니다. 보존된 초기 adapter의 observation.state는 torso·left·right pose를 합친 18D입니다. 이것은 정책 관측의 폭이며 후속 모델의 16D action 폭과 같은 숫자일 필요가 없습니다.

카메라 frame은 timestamp와 함께 임시 array packet으로 worker에 전달하고, adapter가 RGB 배열을 tensor·CHW·float 입력으로 바꿉니다. 초기 bundle은 360×640으로 resize하며 processor와 policy를 같은 device에 두고, TCP offset을 반영한 상태 history를 유지합니다. 이 전처리는 연구 모델이 기대한 관측의 일부이므로 공통 robot dispatch 안으로 섞지 않았습니다.

현재 runtime의 일부 source 누락 경로는 zero-fill과 warning으로 계속 진행합니다. 이는 유효한 관측이 확보됐다는 뜻이 아닙니다. 입력 availability·camera age·validity를 preview와 진단에서 함께 봐야 하며, freshness 정보를 기록한다고 모든 누락·stale 입력이 자동 차단되는 것은 아닙니다.

### 2.5 Resize된 영상과 intrinsic도 같은 좌표를 사용

영상 크기를 바꾸면 같은 3D 점의 pixel 좌표도 바뀝니다. 보존된 초기 adapter는 full-resolution intrinsic의 초점거리와 주점을 절반으로 조정하는 경로를 사용합니다. 이는 두 축을 절반으로 resize하는 전제에 연결된 처리이며 임의 crop·해상도에도 그대로 쓸 수 있는 상수는 아닙니다.

K′=[sx0−sxx00sy−syy0001]KCrop과 resize를 적용한 image intrinsic
x0·y0는 원본에서 자른 영역의 시작 pixel, sx·sy는 그 영역을 모델 입력으로 바꾸는 비율입니다. crop이 없으면 x0=y0=0입니다. 이 식은 좌표의 이동·비율을 설명한 일반 pinhole 관계이며, SCDP에 임의 crop 기능을 새로 구현했다는 의미는 아닙니다.

## 3. 16D action과 좌표 변환

### 3.1 22D wrapper와 16D 모델 출력의 불일치

[그림: 16D 모델 action을 gripper와 양팔 delta로 분리하고, 현재 pose를 사용해 native absolute pose6로 바꾸는 경계입니다. 이전 22D torso slice는 새 계약에 존재하지 않습니다.]

16D 모델 action을 gripper와 양팔 delta로 분리하고, 현재 pose를 사용해 native absolute pose6로 바꾸는 경계입니다. 이전 22D torso slice는 새 계약에 존재하지 않습니다. 크게 보기 ↗

후속 모델의 checkpoint와 전후처리 action shape는 16이었지만 manifest·adapter와 일부 metadata는 이전 22D 구성을 유지했습니다. 이 상태에서는 모델 load가 성공하더라도 torso slice가 비거나 다른 구간을 잘못된 명령으로 해석할 수 있었습니다.

이 연동 버전에서 합의한 16D action layout
| 구간 — 끝 index 미포함 | 내용 | native 변환

| 0:2 | 그리퍼 force target 2개 | 그리퍼 목표 mapping

| 2:4 | 그리퍼 position target 2개 | 그리퍼 목표 mapping

| 4:7 / 7:10 | 왼팔 위치 delta / rotation-vector delta | 현재 왼팔 pose와 합성

| 10:13 / 13:16 | 오른팔 위치 delta / rotation-vector delta | 현재 오른팔 pose와 합성

| 16:22 | 새 출력에는 없음 | 이전 torso mapping 제거

이 16D layout은 해당 로컬 모델과 wrapper의 계약입니다. SCDP 논문 자체가 모든 로봇에서 16D를 사용한다는 뜻은 아닙니다. 출력 폭을 고치는 일과 그 숫자의 물리적 의미를 맞추는 일도 별도로 처리했습니다.

### 3.2 Rotation vector를 RPY 각도 세 개로 취급할 수 없음

MiMicX의 task teleop pose6는 절대 위치와 RPY degree를 받습니다. 전달받은 양팔 action은 현재 자세에서의 위치 변화와 radian rotation-vector 변화였습니다. 둘 다 숫자 6개여서 길이 검사만으로는 차이를 잡을 수 없었습니다.

Rotation vector r는 회전축에 회전각을 곱한 값이고, θ=‖r‖는 radian 회전각입니다. [r]×를 외적 행렬이라고 두면 Rodrigues 식으로 회전행렬을 얻습니다. RPY 성분에 r를 그대로 더하거나 radian을 degree로 바꾸기만 하는 처리로는 이 회전을 복원할 수 없습니다.

Rδ=I+sinθθ[r]×+1−cosθθ2[r]×2Rotation vector → 회전행렬
θ가 0이면 Rδ=I이고, 작은 각도에서는 sinθ/θ와 (1−cosθ)/θ²의 극한이 각각 1과 1/2입니다. 수치 구현에서는 이 구간을 안정적으로 처리해야 합니다. 기존 RPY에서 얻은 현재 회전과 이 행렬을 합성한 다음 최종 RPY degree로 되돌립니다.

### 3.3 Delta 정의에서 좌곱 순서를 유도

Rδ=RnextRcurrent−1Rtarget=RδRcurrentptarget=pcurrent+Δp전달받은 delta 정의와 절대 회전 복원
주어진 정의의 양변에 Rcurrent를 오른쪽에서 곱하면 Rnext=RδRcurrent가 됩니다. 행렬 곱은 일반적으로 교환되지 않으므로 RcurrentRδ로 바꾸면 다른 좌표 convention의 회전입니다. 위치 delta도 현재 위치와 동일한 frame·길이 단위로 맞춘 뒤 더해야 합니다.

이 순서로 양팔 target을 만든 뒤 기존 API가 받는 [x,y,z,roll,pitch,yaw]의 mm·degree로 변환했습니다. 모델 고유의 상대 표현은 adapter에서 끝내고 backend의 절대 pose 명령 의미를 유지한 것입니다.

### 3.4 회전행렬에서 기존 Robot API pose로 복원

보존 adapter가 사용하는 RPY convention은 R=Rz(yaw)Ry(pitch)Rx(roll)입니다. 비특이 구간에서는 다음 관계로 각도를 읽고 radian을 degree로 바꿉니다. R의 Rij는 회전행렬의 i행 j열입니다.

roll=atan2(R32,R33)pitch=atan2(−R31,R112+R212)yaw=atan2(R21,R11)ZYX convention에서 RPY 복원 — 비특이 구간
Pitch가 ±90° 근처이면 roll·yaw를 유일하게 분리하기 어려운 Euler 특이점이 있습니다. 각도 숫자의 단순 차이보다 회전행렬이나 상대 회전각으로 동등성을 비교하는 편이 적절합니다. 회전 표현을 바꾼다는 것은 단위 이름만 바꾸는 일이 아니라 이런 convention과 특이 구간까지 포함한 해석입니다.

### 3.5 곱 순서·단위·slice를 분리해 확인하는 예

설명용 계산 예 — 실제 측정·시험 성적이 아님
| 조건 | 기대되는 해석

| 현재 위치 [100,200,300] mm, Δp=[5,−2,1] mm | 절대 목표 [105,198,301] mm

| r=[0,0,0] rad | 현재 회전을 그대로 유지

| 현재 Rx(90°), rδ=[0,0,π/2] rad | Rz(90°)Rx(90°); 현재 x축은 base의 +y 방향

| 반대 순서 Rx(90°)Rz(90°) | x축은 +z 방향: 같은 target이 아님

| 왼팔과 오른팔에 서로 다른 표식 delta | 각 slice가 올바른 소속 pose에 합성되는지 분리

단위 환산·축 하나의 회전·양팔 slice를 작은 예로 나누면 실제 로봇에서 방향이 이상하다는 현상을 더 구체적으로 조사할 수 있습니다. 이 표는 변환 원리를 설명하기 위한 계산이며 정책의 task 성공률을 나타내지 않습니다.

## 4. 실행 제어와 문제 조사

### 4.1 정책 계산과 실제 장치 제어권을 분리

Backend tick은 현재 control·카메라를 읽고 mapping된 입력과 context를 persistent worker에 보냅니다. worker가 반환한 값을 action key로 split한 뒤 유한성·길이와 명령 형식을 검사하고 command builder에 넘깁니다. Adapter가 SDK로 별도의 현재 pose를 읽으면 기준 snapshot과 다른 시점의 상태로 delta를 합성할 수 있어, runtime이 제공한 상태를 기준으로 삼아야 합니다.

Preview only는 command 후보를 생성하되 hardware dispatch를 생략합니다. Live pose 실행에서는 operator가 Task Teleop를 명시적으로 켜야 하고, backend가 제어 상태를 확인합니다. 이 task-space 경로의 MoveTeleL은 TELE_OP 상태값 17을 요구하며, IDLE 전환·settle·정지 사유도 따로 다룹니다. 모델이 숫자를 반환했다는 사실만으로 명령이 전달된 것은 아닙니다.

Null·NaN·길이가 부족한 action이나 잘못된 command는 현재 tick의 오류로 처리합니다. 이전 action을 새 예측처럼 조용히 재사용하지 않도록 하는 경계입니다. Stop과 reload 시에는 loop·worker·정책의 내부 history 및 소유한 teleop route의 수명주기를 함께 고려해야 합니다.

### 4.2 같은 manifest 이름과 다른 실행 bundle

여러 task와 버전의 폴더가 같은 manifest id/name을 사용하면 UI의 이름만으로는 실제 실행 대상을 구별하기 어려웠습니다. 저는 Deploy 실험 중 이 문제를 관찰하고, 폴더 기반 bundle 선택과 manifest의 표시 identity를 나누도록 요구했습니다.

현재 보존 runtime의 load 재사용 판단은 manifest id뿐 아니라 model_dir·device·options·현재 Python 사용 여부도 비교합니다. 같은 id여도 폴더가 다르면 reload해야 한다는 의미입니다. 다만 같은 폴더 안에서 weight를 교체한 것을 checkpoint 내용 hash로 자동 검출하는 것과는 다르므로, 파일을 교체한 경우 명시적 reload와 상태 초기화가 필요합니다.

### 4.3 Raw output·Action·Command·실제 상태를 나누어 관찰

진단 지점과 조사할 문제
| 관찰 | 해석할 경계

| Import / load | 환경·policy class·checkpoint·processor·device

| 입력 source / image / age | mapping·카메라·현재 상태·누락 warning

| Raw output / action slice | 모델 출력 폭·정규화 복원·manifest·adapter

| 변환된 command target | 단위·상대/절대·회전 합성·robot owner

| Dispatch / op-state | preview 여부·Task Teleop·현재 제어 mode·정지 사유

| Inference / dispatch / loop timing | 정책 계산과 명령 전송의 시간·주기 차이

로봇 흔들림을 조사하면서 모델 output만이 아니라 현재 pose·joint·model input, 변환된 command, timing과 input freshness를 함께 비교할 수 있어야 한다고 요구했습니다. 그래프와 영상을 같은 run으로 저장하고 Visualization에서 수집 task와 분리해 탐색하는 요구도 구체화했습니다.

실행 경로의 last_output·last_tick·input_health·runtime_health와 runtime log는 최근 추론과 명령 상태를 보여 줍니다. 최신 상태를 표시하는 기능과 run 단위의 영상·그래프를 보존하는 기능은 별개입니다. 저는 같은 실행의 관측·예측·명령을 연결해 비교할 수 있도록 진단 요구를 구체화했습니다. 기록을 많이 남기는 것보다 그 기록들이 같은 실행과 시점을 가리키는지가 중요했습니다.

## 5. 결과와 Engineering Note

### 5.1 Adapter 수정과 실로봇 확인의 결과

16D action을 좌·우·gripper로 재분할하고, torso mapping을 제거한 뒤 양팔 rotvec delta를 절대 pose6로 변환하는 adapter를 구현했습니다. 변환된 명령이 기존 MiMicX 실행 경로를 통해 실제 로봇에서 동작하는 것까지 직접 확인했습니다.

이 결과는 외부 연구 모델과 사내 플랫폼 사이의 차원·좌표 표현 호환성을 해결한 경험입니다. 논문의 학습·정량 성능 평가나 모든 task·version의 반복 성공률을 제가 수행한 결과로 옮기지는 않습니다. 실험별 영상·결과 비교는 별도 실험 기록에서 다룹니다.

### 5.2 공통 인터페이스는 차이를 숨기지 않아야 한다

처음에는 출력 길이 22를 16으로 바꾸면 연결될 것처럼 보였지만, 더 중요한 차이는 회전값 세 개의 의미였습니다. Shape를 맞춘 뒤에도 상대 rotvec를 절대 RPY로 읽으면 로봇은 다른 목표를 받습니다. 차원 검증과 물리적 의미 검증을 나눠야 했던 이유입니다.

모델 고유의 표현은 adapter가 해석하고, 장치의 실행 권한은 backend가 판단한다는 경계를 유지했습니다. 이 경계가 있어야 새 정책을 붙이면서 기존 robot API의 의미까지 바꾸지 않을 수 있습니다. 연구 모델을 load하는 데서 그치지 않고, 입력의 좌표와 시간부터 최종 장치 명령까지 뜻이 이어지는지 확인하는 것이 rollout 통합의 책임이었습니다.

## References

- [SCDP] Kim et al. — Spatially Conditioned Diffusion Policy, arXiv v2, §3 / Fig. 2
연구 모델 원리와 그림 출처. 논문의 설계·학습·평가와 플랫폼 adapter 기여를 구분합니다.

- [SCDP-CODE] SCDP official implementation — Real-World setup and inference
공개 최신 코드의 데이터·calibration·제어 연결 안내. 전달받은 로컬 bundle과 동일 revision으로 단정하지 않습니다.

- [CC-BY] Creative Commons Attribution 4.0 International
SCDP arXiv v2 Figure 2의 재사용 조건. 저자 원본 PNG를 변경 없이 사용했습니다.

CONTINUE READING

## Related Records

System Overview

### 플랫폼 개요

장치·session·수집·전처리·학습·배포의 전체 구조와 상태 소유권, 데이터·모델 계약을 설명합니다.
↗

Technical Report

### Diffusion Policy 연동

Diffusion Policy를 기존 모델 선택·학습·checkpoint·실행 구조에 통합했습니다.
↗

Technical Report

### 기업·연구 지원

삼성SDI 실행 조건 정리, KAIST 모델의 16D rotvec 출력 계약과 로봇 명령 연동.
↗

Technical Report

### 기술 문서화·인수인계

기존 시스템을 이해한 내용을 온보딩·아키텍처·운영·진단 문서로 정리하고 전달했습니다.
↗
