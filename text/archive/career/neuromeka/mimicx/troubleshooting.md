# 안정화·문제해결 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/mimicx/troubleshooting.html

TECHNICAL REPORT

# 안정화·문제해결

장치·데이터·학습·실행의 오류를 아홉 분야로 나눠 원인 추적, 수정 과정과 회귀 검사를 설명합니다.

TroubleshootingDiagnosticsMiMicX

MY ROLE
원인 분석 · 수정 · 재검증

DOCUMENT
Technical Report

MiMicX의 기능 확장과 리팩토링 과정에서 장치 소속, 좌표·출력 표현, 수집·학습 산출물, 실행 상태와 관찰 경로를 안정화했습니다. 장치는 연결됐는데 동작하지 않거나, 준비 검사는 통과했는데 실행이 실패하는 사건을 데이터와 명령이 끊긴 경계로 나누어 추적했습니다.

아래 아홉 분야는 서로 다른 실패를 하나의 연결 오류로 묶지 않기 위한 분류입니다. 정상 흐름과 실패 조건을 비교하고, 첫 수정이 충분하지 않았던 이유, 최종적으로 바꾼 계약과 회귀 검사까지 연결해 설명합니다.

## 1. 장치 소속과 매핑

### 1.1 Fault Map: Follow the Boundary That Changed the Meaning

MiMicX는 화면에서 장치를 등록한 뒤 텔레오퍼레이션·수집·변환·학습·추론·Replay로 이어집니다. 기능을 추가하면 같은 데이터가 UI payload, 저장 설정, worker binding, episode metadata와 checkpoint 계약을 통과합니다. 한 단계만 새 구조로 바꾸면 다음 단계는 예전 가정으로 값을 해석합니다. 안정화에서는 오류 메시지 자체와 함께 이 경계들을 따라갔습니다.

[그림: Figure 1. 정상 데이터·명령 흐름에 대표 실패 경계를 표시했습니다. 화면 상태와 물리 동작을 같은 노드로 취급하지 않고, 수집·변환·실행·관찰이 실제로 어느 정보를 소비하는지 나눴습니다. 구현을 바탕으로 재구성한 설명도입니다.]

Figure 1. 정상 데이터·명령 흐름에 대표 실패 경계를 표시했습니다. 화면 상태와 물리 동작을 같은 노드로 취급하지 않고, 수집·변환·실행·관찰이 실제로 어느 정보를 소비하는지 나눴습니다. 구현을 바탕으로 재구성한 설명도입니다. 크게 보기 ↗

특히 화면에서 선택한 로봇, session 참가자 전체, 파일에 저장된 robot key, 현재 runtime robot ID는 목적이 다릅니다. 화면 focus를 수집 대상 전체로 사용하면 한 대만 기록되고, 첫 장치를 기본값으로 쓰면 잘못된 팔이나 그리퍼에 명령을 보낼 수 있습니다. 어느 장치의 값인지 유지하는 계약이 수집과 실행 양쪽에 필요했습니다.

### 1.2 Dual-Arm and Multi-Robot Ownership: Side Is Not a Global Channel

[그림: Figure 2. UI 선택, session participant, 저장 robot key, runtime ID와 end-effector 소속의 역할을 분리했습니다. 좌우 팔과 도구 channel의 대응은 로봇 종류에 따라 달라지므로 owner를 먼저 해석합니다.]

Figure 2. UI 선택, session participant, 저장 robot key, runtime ID와 end-effector 소속의 역할을 분리했습니다. 좌우 팔과 도구 channel의 대응은 로봇 종류에 따라 달라지므로 owner를 먼저 해석합니다. 크게 보기 ↗

양팔 SpaceMouse와 binary gripper에서는 등록 데이터에 robot_ref만 있고 arm·channel이 빠진 경우가 문제가 됐습니다. UI에서 두 장치가 보여도 명령 target 계산이 fallback에 의존하면 같은 팔로 몰릴 수 있습니다. 등록·수정 시 owner를 함께 저장하고 카드에도 소속을 표시하며, tool index 계산에서 저장된 팔을 먼저 사용하도록 정리했습니다.

Channel 0을 무조건 left라고 정할 수도 없습니다. 예를 들어 Dual NURI의 tool-index 해석은 다른 양팔 타입과 같은 좌우 순서가 아닙니다. 따라서 장치 목록 순서나 side 문자열을 곧바로 물리 channel로 복사하지 않고, robot type과 저장 owner를 함께 해석합니다. 기존의 잘못 저장된 항목은 코드 수정만으로 정정되지 않으므로 재등록·복구 대상도 나눠야 했습니다.

다중 로봇에서는 episode의 robot key와 runtime ID 사이의 명시적 mapping으로 dispatch합니다. 수집 tick에는 session 참가자 전체 snapshot이 필요하고, 종료에는 session 전체의 stop 결과가 필요합니다. 한 로봇의 Move Robot focus를 이 두 범위에 재사용하지 않았습니다. 단일 로봇·기존 side-qualified 데이터와 robot-keyed 데이터의 호환 경로도 유지했습니다.

### 1.3 Camera Identity: Keep Names, Order and Physical Matching Separate

카메라 삭제·재등록이나 rename 뒤 checkpoint에서 장치를 찾지 못하는 문제는 영상 frame 자체보다 identity가 흔들린 경우였습니다. 표시 이름은 사람이 알아보기 위한 metadata이고, camera_key·hardware ID·serial은 기존 물리 장치와 대응시키는 정보입니다. 이름을 바꾸었다고 학습 입력의 의미까지 바뀌어서는 안 됩니다.

카메라 정보의 역할
| 정보 | 역할 | 잘못 사용했을 때

| Display name | UI 표시 | rename을 새 장치로 오인

| Stable identity | 등록 장치·모델 binding 대응 | 재등록 뒤 checkpoint의 카메라 유실

| Canonical order / slot | 수집·학습·실행의 입력 순서 | 같은 개수지만 서로 다른 시점의 영상 입력

| Profile | 해상도·FPS 등 촬영 조건 | 저장값과 fallback 기본값의 불일치

현재 binding은 stable identity가 있는 항목을 우선 대응시키고, 정보가 없는 legacy 항목은 이름 기반 경로를 남깁니다. Capture·training·deploy는 backend가 정한 camera order를 함께 사용합니다. 해상도도 설정 화면의 숫자만 보지 않고 실제 등록 항목과 runtime profile을 확인했습니다. 640×480을 의도했는데 1280×720 fallback이 적용되는 문제에서는 기본값을 맞추되, 이미 저장된 사용자 profile을 무조건 덮어쓰지 않았습니다.

## 2. 좌표계와 텔레오퍼레이션

### 2.1 Coordinate and Calibration Failures: A File Is Not an Active Binding

Vive calibration JSON이 있어도 Task TeleMove가 즉시 Idle로 돌아가거나, 매핑된 장치가 필요하다고 판단하는 경우가 있었습니다. Calibration 결과 파일의 존재와 현재 robot·arm·device binding에 적용되었다는 사실이 달랐기 때문입니다. Tracking validity 저하를 장치 disconnect와 같은 상태로 처리한 것도 정상 연결을 불안정하게 보이게 했습니다.

좌표·매핑 문제의 분리 기준
| 관찰 | 대조할 계약 | 수정·검사 방향

| 연결은 유지되나 pose 유효성 감소 | connection vs tracking validity | 연결 수명과 sample 사용 가능성 분리

| calibration 파일은 있으나 preflight 실패 | artifact vs 선택 binding·teaching config | 선택 robot/arm/device에 적용하고 mirror 갱신

| 방향만 잘못 추종 | 회전 convention·기준 frame | adapter에서 변환하고 기대 pose 비교

| 좌우 라벨이 자동 표시 | controller role vs robot assignment | 실제 backend binding이 있을 때 소속 표시

위치는 m/mm, 방향은 quaternion·rotation vector·RPY, pose는 절대/상대와 기준 frame을 구분했습니다. 벡터 길이가 같아도 회전 곱 순서나 기준 좌표가 다르면 다른 명령입니다. UI에서 보정값을 덧대기보다 adapter가 어떤 입력을 어떤 robot pose 표현으로 반환해야 하는지 정하고, calibration 선택 뒤 상태·binding·teaching registry를 함께 다시 읽게 했습니다.

### 2.2 XR Jog Regression: Preserve the Existing Pose Contribution

XR thumbstick XY 조그를 추가했을 때에는 입력 자체는 정상이었지만 기존 pose 조작이 사라졌습니다. 초기 planar 조그 분기의 early return이 pose target 계산을 우회했기 때문입니다. Stick이 중립이면 기준 목표만 남아, 컨트롤러를 움직여도 목표가 바뀌지 않았습니다.

Pose target을 먼저 계산하고 누적 jog offset을 더하도록 수정했습니다. 이후 squeeze를 누르지 않아도 stick으로 조그할 수 있게 gate를 분리했습니다. 조그를 놓을 때에는 offset만 지우는 것이 아니라 현재 로봇 pose와 현재 controller sample을 새 기준으로 잡았습니다. 그렇지 않으면 이전 reference로 target이 돌아갑니다.

재확인 조건도 “움직인다” 하나가 아니었습니다. 중립 stick에서 pose 유지, pose+조그 합성, stick-only 입력, release 뒤 재기준화를 나눴습니다. Idle의 버튼 감시는 motion target 생성과 분리했습니다. 전체 변환식과 축 mapping은 XR 컨트롤러 응용의 세부 보고서에 설명했습니다.

## 3. 설정 저장과 UI 상태

### 3.1 Configuration Persistence: Close the UI–Payload–Runtime Round Trip

[그림: Figure 3. 사용자가 선택한 설정은 화면, 요청, 저장 params, runtime binding, 상태 응답을 한 바퀴 돌아야 유지됩니다. 늦게 도착한 refresh가 편집 중 상태를 덮어쓰는 경로도 별도 문제입니다.]

Figure 3. 사용자가 선택한 설정은 화면, 요청, 저장 params, runtime binding, 상태 응답을 한 바퀴 돌아야 유지됩니다. 늦게 도착한 refresh가 편집 중 상태를 덮어쓰는 경로도 별도 문제입니다. 크게 보기 ↗

Add Pose Device에서 고른 SpaceMouse 축·scale·button 설정이 등록 후 초기화되는 문제는 modal에서 수집한 값이 실제 add payload에 포함되지 않은 데서 시작했습니다. 선택 UI가 있다는 사실은 저장 구현이 있다는 증거가 아니었습니다. Modal 값을 payload에 넣고 check 응답에도 현재 params를 포함해 polling 후 화면이 저장값을 복원하도록 맞췄습니다.

연결 pill이 느리거나 두 번째 장치가 연결된 것으로 바뀌지 않는 문제는 또 달랐습니다. Live poll 결과가 카드 상단 badge로 전달되지 않는 지점과, monitor를 등록하기 전에 즉시 refresh를 호출해 갱신이 무시되는 순서를 보강했습니다. 값을 얻는 경로와 화면에 반영하는 경로를 각각 확인해야 했습니다.

반대로 사용자가 mode를 바꾸거나 카메라 rename·index·profile을 편집하는 중에는 주기적 전체 목록 렌더가 입력창을 닫거나 이전 값으로 되돌렸습니다. 편집·저장 요청이 진행되는 동안 stale refresh가 local intent를 덮지 않도록 하고, backend 저장 결과를 받은 뒤 다시 동기화했습니다. 저장 owner는 backend에 두면서 편집 중 상태의 수명을 보호한 것입니다.

### 3.2 Derived UI State: Crop, Mapping and TE Settings

Crop Preview에서는 drag overlay와 generic resize 상태가 섞이면 화면에서 움직인 영역이 실제 camera crop payload와 달라집니다. 카메라별 crop bounds를 분리하고 original frame drag와 zoom 편집이 같은 backend crop 값으로 이어지도록 했습니다. Crop 축 라벨이 영상을 가리는 표시 문제와 crop 계산 오류도 별도로 확인했습니다.

Input/Output Mapping에서는 relative-delta를 만들 때 모든 가능한 target을 확장하면 선택하지 않은 torso·right 출력이 따라붙었습니다. 선택된 action target만 파생시키고, key를 바꾼 뒤에는 Apply 상태를 dirty로 돌려야 했습니다. Applied 표시는 마지막으로 버튼을 눌렀다는 뜻이 아니라 현재 선택이 적용된 계약과 일치한다는 뜻이어야 합니다.

ACT TE 설정도 저장 API에 필드가 있어도 Deploy가 다시 읽는 status 응답에서 빠지면 refresh 뒤 초기화됐습니다. Enabled·schedule·alpha를 inference snapshot에 포함하고, ACT family·horizon·RTC 조건의 guard는 backend에서 판단해 UI에 표시했습니다. TE는 학습 architecture 선택이 아니라 배포 시 ACT chunk를 결합하는 runtime 설정으로 다뤘습니다.

## 4. 데이터 준비 상태와 변환

### 4.1 Readiness: Resolve the Exact Selection Before Counting It

[그림: Figure 4. 화면의 준비 검사와 worker launch 직전 검사는 같은 질문이 아닙니다. 선택 경로를 정규화한 뒤 raw metadata를 확인하고, 실제 materialized dataset의 가독성·선택 key까지 검사해야 합니다.]

Figure 4. 화면의 준비 검사와 worker launch 직전 검사는 같은 질문이 아닙니다. 선택 경로를 정규화한 뒤 raw metadata를 확인하고, 실제 materialized dataset의 가독성·선택 key까지 검사해야 합니다. 크게 보기 ↗

같은 task가 task_name과 task_names에 동시에 들어오면 episode가 두 번 집계됐습니다. 단일 선택·복수 선택·직접 경로·dataset ID를 합친 후 resolved path를 기준으로 중복을 제거했습니다. 요청 필드가 다르다는 이유만으로 별도의 데이터로 세지 않았습니다.

CapturePlan이 없는 과거 task는 raw episode metadata로 camera·control mode 등을 복원할 수 있는지 확인했습니다. Plan 파일이 없다는 이유만으로 전부 거부하지 않되, 선택한 카메라가 실제 계약에 없거나 필수 정보를 복원할 수 없으면 blocker로 남겼습니다. Fallback은 검사 생략이 아니라 다른 신뢰 가능한 입력을 쓰는 경로입니다.

### 4.2 Unreadable Episodes: A Blocked Report Is More Useful Than HTTP 500

한 HDF5가 손상됐을 때 전체 readiness 요청이 server error로 끝나면 사용자는 어떤 파일을 제외하거나 복구해야 할지 알 수 없습니다. Episode별 I/O 예외를 모아 파일명을 포함한 blocker로 반환하도록 했습니다. 전체 episode 수와 실제 usable 수를 따로 제시해야 정상 파일이 있다는 사실도 보존할 수 있습니다.

기존 fixture가 확인하는 readiness 계약
| 조건 | 기대 결과 | 검사 의미

| 동일 task를 단일·복수 필드로 전송 | 정규화한 경로 한 개 | 중복 요청이 중복 데이터가 되지 않음

| 정상 H5 1개 + 읽을 수 없는 H5 1개 | blocked, 전체2·usable1·문제 파일명 | I/O 실패의 위치를 보고

| RGB sidecar가 source에만 존재 | manifest로 source를 찾아 ready | staging 위치와 원본 media의 연결

| 선택 카메라가 계획·metadata에 없음 | blocker | 파일 존재와 모델 입력 준비를 구분

QA에서도 검사를 통과한 파일과 실제 사용자가 선택한 episode가 같은지 확인해야 합니다. 다른 h5_path나 계획만 검사한 결과로 실제 데이터가 정상이라고 표시하면 false pass가 됩니다. 확인 결과에는 대상 selection·episode와 검사 항목을 결합해야 했습니다.

### 4.3 Ready Before Conversion Is Not Ready to Launch

Ready 이후 학습 시작에서 selected key가 없다고 실패하는 경우에는 두 검사가 다른 schema를 보고 있었습니다. Raw 단계의 계약과 변환된 training key는 같은 namespace가 아니고, 선택·curation·relative output·hand 변환이 materialization에서 결과를 바꿉니다. 모델을 바꾸기 전에 두 단계가 같은 선택과 산출물을 보는지 확인했습니다.

현재 launch 준비는 selection materialize → 필요 시 convert → 실제 episode 파일 열기 → dataset schema inspect → 선택 input/output key 검증 → worker launch 순서입니다. 이미지 materialization의 일시적 미완료에는 해당 오류에만 제한된 retry를 적용합니다. Key 누락이나 손상 파일을 무제한 retry로 감추지 않습니다.

Diffusion 통합에서는 공개 recipe와 내부 lowdim/RGB variant도 나눴습니다. 브라우저가 카메라 이름만 보고 variant를 추측하지 않고 backend가 선택 key와 capability로 결정하게 했습니다. Provider kwargs와 service-owned image 설정의 중복, 3×3 orientation을 그대로 이어붙여 발생한 U-Net channel 불일치는 각각 config 소유권과 action 표현 변환의 문제로 처리했습니다.

## 5. 영상·산출물의 원본 추적

### 5.1 RGB Sidecar Lineage: Follow the Source, Not Only the Staging Directory

[그림: Figure 5. Staged H5 파일명·위치는 원본과 달라질 수 있습니다. Selection manifest와 episode video metadata가 source H5·MP4로 돌아가는 연결을 보존합니다. 경로 예시는 실제 내부 경로를 사용하지 않은 개념명입니다.]

Figure 5. Staged H5 파일명·위치는 원본과 달라질 수 있습니다. Selection manifest와 episode video metadata가 source H5·MP4로 돌아가는 연결을 보존합니다. 경로 예시는 실제 내부 경로를 사용하지 않은 개념명입니다. 크게 보기 ↗

RGB를 MP4 sidecar에 저장한 episode는 HDF5 하나로 완결되지 않습니다. 여러 task를 모아 H5를 staging하면서 파일명을 바꾼 뒤 그 옆에서 MP4를 찾으면, 원본 task에 정상 영상이 있어도 누락으로 판단할 수 있습니다. 문제는 촬영 실패가 아니라 lineage가 끊긴 것이었습니다.

Episode metadata의 video_files와 selection manifest의 source→dest 대응을 사용해 원본 H5 옆의 media를 찾도록 했습니다. Selection materialize 단계에서는 sidecar도 연결하고, readiness에서도 staged 위치뿐 아니라 manifest source 위치를 후보로 확인합니다. 영상이 실제로 없던 과거 episode와 존재하는 영상을 못 찾은 경우는 복구 방법이 다릅니다.

경로를 찾은 뒤에도 frame index·timestamp와 decode 가능성은 별도입니다. Stream alignment가 실패하면 순차 decode 경로를 구분해 처리해야 합니다. Source 경로 fixture에 fake video bytes가 있다는 것만으로 실제 MP4 전체 decode가 검증됐다고 보지 않았습니다. Media 존재, 읽기·decode, sample 정렬은 서로 다른 검사입니다.

### 5.2 Artifact Reuse: Existence Is Weaker Than Eligibility

Processed directory가 존재한다는 이유로 재사용하면 이전 변환이 중단된 파일이나 손상된 HDF5를 다시 학습에 넘길 수 있습니다. 재사용 가능한 선택·manifest인지 확인하고, launch 전에 실제 episode를 열어 key를 읽으며 선택 schema를 대조합니다. 불완전한 산출물이 cache hit처럼 보이지 않게 해야 했습니다.

산출물 검사 단계
| 확인 | 알 수 있는 것 | 아직 보장하지 않는 것

| 경로 존재 | 파일 또는 directory가 있음 | 가독성·완료 여부

| HDF5 open·keys 조회 | 컨테이너 구조를 읽을 수 있음 | 선택 key·값 의미

| 선택 key·shape 검사 | 모델의 구조 계약과 대조 가능 | 모든 frame decode·실물 성능

| lineage·metadata 대응 | 선택 원본과 산출물 관계 | 과거 파일의 미생성 RGB 복원

원본 데이터는 유지하고 selection·변환 산출물의 연결을 추적했습니다. 오류를 피하려고 임의의 파일을 재사용하거나 필요한 key를 삭제하면 ready 표시는 얻어도 다른 데이터를 학습하게 됩니다. 이 문제에서 완료 기준은 “재시도했더니 시작됨”이 아니라 어떤 원본과 변환 계약으로 시작했는지 설명할 수 있는가였습니다.

## 6. Schema·tensor의 의미

### 6.1 Mixed Output Decode: Preserve Non-Pose Values

[그림: Figure 6. 회전의 표현 크기 변화와 손 관절 유실은 다른 문제입니다. 위는 정상 혼합 출력 decode, 아래는 zero-placeholder를 현재 pose label로 바꾸는 별도의 전처리 경로입니다.]

Figure 6. 회전의 표현 크기 변화와 손 관절 유실은 다른 문제입니다. 위는 정상 혼합 출력 decode, 아래는 zero-placeholder를 현재 pose label로 바꾸는 별도의 전처리 경로입니다. 크게 보기 ↗

DG-4F 혼합 학습에서는 예측 24개와 정답 60개가 맞지 않았습니다. 모델 내부의 팔 회전은 각 팔 6D 표현이고 외부 pose는 3×3 회전행렬입니다. 따라서 내부 54개가 복원 후 60개가 되는 것은 정상입니다. 문제는 팔 pose를 복원한 결과만 반환하면서 뒤의 손 관절 36개를 버린 것이었습니다.

6+12+36=54→6+18+36=60Representation size, not physical DOF
정답을 24개로 줄여 loss 오류만 없애면 손을 학습하지 않는 모델이 됩니다. Pose slice만 회전 변환하고 나머지 output을 보존해 다시 합쳐야 했습니다. 이 숫자는 12DOF 양팔의 물리 관절 수가 아니라 학습 target과 모델 내부 표현의 vector 크기입니다.

다른 사건에서는 EIR의 live q/qdot에 torso·head가 포함되는데 checkpoint는 arm task-joint layout을 기대했습니다. 전체 배열에서 임의로 앞 N개를 자르기보다 task가 요구하는 관절 구성과 canonical order로 정규화해야 합니다. Split left/right 입력과 all 입력도 같은 순서로 materialize되어야 같은 모델 입력입니다.

### 6.2 Inactive Teleoperation: Zero Placeholder Is Not a Move-to-Origin Label

Teleoperation이 비활성인 행의 6개 명령값이 모두 0으로 저장된 경우, 이를 실제 absolute pose target으로 해석하면 원점으로 이동하라는 학습 label이 됩니다. 학습과 Replay가 그럴듯해 보여도 deploy에서 한쪽 팔이 튀는 원인을 만들 수 있습니다.

전처리에서는 이 teleop command 계약의 all-six near-zero 행을 placeholder로 식별하고, 해당 행의 target position과 orientation을 같은 시점 observation pose로 채웠습니다. 현재 구현의 mask tolerance는 10⁻⁶이고, 행 수·필수 관측 key가 맞는지도 확인합니다. Position만 채우고 orientation은 0으로 두는 식으로 절반만 보정하지 않습니다.

이 규칙은 모든 데이터의 0을 무효값으로 보는 정책이 아닙니다. 센서의 정상 영점이나 실제 원점 명령도 0일 수 있습니다. 해당 stream이 비활성 명령을 어떻게 표현하는지를 알고 적용해야 합니다. 값의 범위만으로 의미를 추측하면 정상 데이터까지 바꾸게 됩니다.

### 6.3 Tesollo Mode Sentinel: Relax the Right Check, Keep Ownership Strict

Replay는 hand feedback joint pose와 grasp force/state를 사용해 동작하는데 training conversion은 mode=-1 때문에 실패하는 경우가 있었습니다. 이때 -1은 새로운 mode로 바꾸라는 명령이 아니라 명시적 mode 변경이 없다는 sentinel로 다뤄야 했습니다. Replay가 동작한다는 사실만으로 학습 schema 준비까지 입증되는 것은 아니었습니다.

Mode를 명시적으로 선택한 뒤 force·release 행에서 새 mode가 없으면 마지막 유효 mode를 capture state에 유지하도록 했습니다. Replay에서는 non-positive mode를 실제 mode 변경으로 보내지 않고, conversion에서도 unchanged만으로 잘못된 구체 mode라고 판단하지 않습니다.

반면 side·robot owner 누락, owner 중복, 선택한 grasp stream 부재, profile·joint count 불일치는 그대로 blocker입니다. Sentinel 해석을 고친다는 이유로 전체 검사를 느슨하게 하지 않았습니다. 명시 command joint를 썼는지 feedback에서 target을 유도했는지도 모델 metadata에서 구분해야 했습니다.

### 6.4 Weak Close: Raw Model Output and Effective Command Are Different

[그림: Figure 7. Binary gripper에는 연속 예측값을 그대로 약한 중간 위치로 보내는 대신 hysteresis로 open/close를 결정합니다. 예시 open=1000, close=0은 명령 표현의 계산이며 실제 힘 측정 그래프가 아닙니다.]

Figure 7. Binary gripper에는 연속 예측값을 그대로 약한 중간 위치로 보내는 대신 hysteresis로 open/close를 결정합니다. 예시 open=1000, close=0은 명령 표현의 계산이며 실제 힘 측정 그래프가 아닙니다. 크게 보기 ↗

모델의 gripper 출력이 중간값이거나 open 쪽으로 치우치면 실제로 충분히 닫히지 않을 수 있습니다. Binary 도구에서는 open·close 설정 사이의 midpoint와 hysteresis band로 effective action을 정하고, band 안에서는 이전 동작을 유지하도록 했습니다. 실제 grasp 성능을 신경망 loss 하나로 판단할 수 없는 사례였습니다.

m=qopen+qclose2,h=max(12.5,0.05|qopen−qclose|)Binary gripper thresholds
Open 방향을 양수로 정규화한 signed distance가 +h 이상이면 open, −h 이하이면 close입니다. Band 안에서 이전 상태가 없으면 midpoint의 어느 쪽인지로 초기 상태를 정합니다. 예시 1000/0에서는 m=500, h=50이므로 550 이상 open, 450 이하 close, 그 사이는 유지입니다. 단위는 이 도구의 command scale입니다.

Dispatch에는 설정된 force를 사용하고 동일 action·position 반복은 생략합니다. 진단에는 raw position/force, effective action/position/force, owner와 실제 dispatch 여부를 함께 남깁니다. 이 출력 보정은 잘못된 학습 데이터나 모델의 open 편향까지 해결했다는 뜻은 아니므로, raw 값과 보정 결과를 모두 볼 수 있어야 했습니다.

## 7. 학습 실행과 상태 관리

### 7.1 Resume: Selected Checkpoint State Must Win Over the Current Workspace

[그림: Figure 8. 편집 중 workspace, 재사용 preset, 선택 run의 복원 상태, 실행 중 job과 pending queue의 수명을 분리했습니다. 특정 checkpoint 재개와 최신 상태 재개는 서로 다른 진입점입니다.]

Figure 8. 편집 중 workspace, 재사용 preset, 선택 run의 복원 상태, 실행 중 job과 pending queue의 수명을 분리했습니다. 특정 checkpoint 재개와 최신 상태 재개는 서로 다른 진입점입니다. 크게 보기 ↗

Checkpoint A를 선택해 재개했는데 마지막 run B의 source·mapping을 읽으면, 사용자는 A를 재개한다고 생각하면서 다른 조건을 적용하게 됩니다. 현재 workspace의 수정도 selected checkpoint 복원을 덮어쓸 수 있습니다. 모델 weight 파일을 찾는 것만으로 resume 준비가 끝나는 것이 아니었습니다.

명시 checkpoint가 있으면 해당 경로와 run manifest에서 source·curation·input/output 설정을 복원합니다. 명시 선택이 없을 때에만 backend resume_state의 checkpoint path를 사용합니다. 잘못된 checkpoint ID를 받았다고 조용히 latest로 바꾸지 않습니다. Preset은 재사용할 편집 snapshot이고 run-derived restore state는 실행 이력이라는 구분도 유지했습니다.

기존 회귀 fixture에서는 A의 dataset·front camera·output·curation을 복원하면서 요청에는 B의 dataset·side camera·다른 output·curation을 넣습니다. 기대값은 A의 설정입니다. 같은 checkpoint의 weight만 읽었는지가 아니라 관련 데이터 계약도 함께 복원했는지를 검사하는 사례입니다.

### 7.2 Job and Queue Lifecycles: Pause Is Not Clear, Stop Is Not Queue Shutdown

실행 job pause와 queue pending 항목을 같은 상태로 표현하면 사용자는 무엇이 멈췄는지 알 수 없습니다. Active job을 pause하면 pending은 기다리고, resume은 active job을 다시 running으로 만듭니다. Pending 취소는 대상 항목만 제거하고 queue clear는 실행 중 job을 지우는 동작과 분리합니다.

현재 보존된 service의 stop fixture는 paused active job을 종료한 뒤 다음 pending job을 시작합니다. 따라서 Stop을 전체 queue 중단으로 안내하면 실제 정책과 달라집니다. 이 동작을 별도의 상태 전이로 드러내고, current active가 없을 때 이전 terminal job을 현재 실행처럼 표시하지 않도록 monitor와 history를 나눴습니다.

새 preset/reset도 이름만 지우는 동작이 아닙니다. Source·curation·mapping·hyperparameter·monitor·current preset 상태가 이전 run의 잔재를 갖지 않도록 초기화 범위를 정리했습니다. 마지막 실행 이력을 보존하는 것과 새 작업 화면을 깨끗하게 만드는 것은 함께 가능합니다.

### 7.3 Failure After Epoch One: Separate Computation from Artifact Commit

한 번은 batch 16, 640×480 조건에서 epoch 1의 loss가 출력된 뒤 “RobotMode is not JSON serializable”로 실패했습니다. 앞선 CUDA OOM과 같은 종류로 보지 않았습니다. Forward/backward와 checkpoint 단계까지 진행한 뒤 resume_state를 쓰는 지점에서 provider config의 enum 객체가 JSON 변환을 깨뜨린 사건이었습니다.

Run manifest 등 다른 저장 경로와 달리 resume_state 저장에 non-JSON 객체 처리가 빠져 있었습니다. 해당 JSON 저장에도 default=str를 적용해 enum을 문자열화하고 provider config에 enum이 들어가는 회귀 사례를 추가했습니다. Python JSON의 default는 기본 encoder가 처리하지 못하는 값을 직렬화 가능한 형태로 돌려주는 경계입니다.[PY-JSON]

이 수정이 중요한 이유는 학습 계산 성공과 재개 가능한 run 산출물 완성이 다르기 때문입니다. Resume state가 실패하면 다음 실행이 source·설정을 복원하지 못합니다. 다만 문자열화는 정보 보존 방식이므로, 이를 enum 객체의 완전한 round-trip 복원과 같은 보장으로 해석하지 않습니다.

## 8. 배포와 실행 환경

### 8.1 Device Access: Discovery, Open and Read Are Separate Checks

[그림: Figure 9. 같은 “장치는 보이는데 입력이 없다”를 HID·OpenVR·OpenXR의 서로 다른 경계로 나눴습니다. 아래 Replay의 registry 문제는 장치 전송 실패가 아니라 service owner 조회 누락입니다.]

Figure 9. 같은 “장치는 보이는데 입력이 없다”를 HID·OpenVR·OpenXR의 서로 다른 경계로 나눴습니다. 아래 Replay의 registry 문제는 장치 전송 실패가 아니라 service owner 조회 누락입니다. 크게 보기 ↗

Docker SpaceMouse에서는 목록에 장치가 보이는 것과 concrete hidraw path로 열어 sample을 읽는 것이 달랐습니다. HID catalog의 token을 경로처럼 다루면 enumerate는 정상이어도 open/read가 실패합니다. Sysfs identity를 따라 장치를 resolve하고 실제 open·read까지 구분했습니다. USB mount 하나로 모든 runtime 조건이 해결된다고 보지 않았습니다.

Host VR bridge도 파일이나 service가 존재한다는 것과 fresh sample을 받는 것은 다릅니다. Runtime session이 값을 만들고, bridge가 전송하고, container client가 현재 sample을 읽고, worker gate를 통과해야 로봇 명령이 됩니다. 각 단계의 정상 관찰을 남겨 앞 단계가 정상일 때 다음 경계로 이동했습니다.

### 8.2 VR Runtime Incidents: Compare Below the Application

Quest/Pico에서는 HMD·controller discovery와 pose가 정상인데 trigger·squeeze가 0인 사건이 있었습니다. GLX context가 생성되지 않거나 software renderer로 동작하는 조건, focus·render path, interaction profile의 active 상태를 나눴습니다. GPU가 목록에 있는 것과 실제 graphics driver가 로드되어 context를 만드는 것도 다른 단계였습니다.

GLFW의 X11 지원 여부와 GLX/Xlib binding의 일치, 요청 OpenGL version, 유효 display/context를 점검하고 version fallback과 명확한 실패 메시지를 보강했습니다. 이후에는 MimicX와 진단 script를 동시에 켜서 진단 도구가 focus를 가져가는 현상도 분리했습니다. Pico 회복 시에는 MimicX 단독 FOCUSED, projection 제출, input_active와 실제 입력값 변화, TeleT 동작을 함께 확인했습니다.

Vive의 별도 사건에서는 pose가 갱신돼도 legacy OpenVR controller state와 SteamVR Input action 둘 다 입력을 제공하지 않았습니다. MiMicX·HTTP·bridge를 거치지 않는 Host monitor에서도 동일해 application 내부 누락과 구분할 수 있었습니다. 당시 SteamVR 2.16 계열에서 이전 branch로 바꾼 뒤 입력이 회복됐고, WiVRn과 SteamVR를 함께 켜도 동작해 단순 runtime 공존 가설을 배제했습니다. 이는 해당 환경에서 수행한 버전 비교 결과입니다.

### 8.3 Replay: Resolve the Owner Service and Hold the Initial Target

Service가 분리된 뒤 data-studio의 로컬 registry에 로봇 정보가 없어 다중 Replay target을 만들지 못하는 경우가 있었습니다. 같은 저장 workspace를 본다고 Python memory도 공유되는 것은 아닙니다. 로컬 목록이 비었거나 필요한 robot ID·접속 정보가 없으면 등록 owner인 device-data에서 읽어와 보강하는 read-through 경로를 사용합니다. 실제 주소는 공개 설명에서 제외했습니다.

초기 자세 이동이 목표 전에 멈춘 문제는 registry 실패와 또 달랐습니다. 단발 Command를 보내고 도착 Polling만 반복하는 경로를 정상 Saved Position의 Joint Move와 비교했습니다. 동일 target을 유지하는 pulse/hold를 적용하고 motion drain·Idle·settle·초기 정렬을 마친 뒤 본 Replay를 시작하게 했습니다. Retry만 늘려서는 실행 방식의 차이가 해결되지 않았습니다.

기록 시간축에서는 pause한 시간만큼 elapsed를 빼야 재개 순간 sample cursor가 앞으로 뛰지 않습니다. Backend cursor 사이의 UI 보간은 화면을 부드럽게 하는 처리이고, 실제 media/table은 sample index로 맞춥니다. 시각적 보간을 물리 로봇의 정량적 동기화 정확도와 같은 것으로 표현하지 않았습니다.

## 9. 진단과 설계 판단

### 9.1 PikaSense Start: A Camera Symptom Caused by a Partial API Migration

[그림: Figure 10. Capture selection이 route·wrapper·worker constructor까지 전달됐지만 중간 entrypoint의 signature에서 끊긴 사건입니다. 카메라가 끊겨 보인 것은 start가 중간에 실패한 뒤의 UI 증상이었습니다.]

Figure 10. Capture selection이 route·wrapper·worker constructor까지 전달됐지만 중간 entrypoint의 signature에서 끊긴 사건입니다. 카메라가 끊겨 보인 것은 start가 중간에 실패한 뒤의 UI 증상이었습니다. 크게 보기 ↗

PikaSense fishcam monitor는 Start 전까지 정상인데, Start를 누르면 연결이 끊긴 것처럼 보였습니다. 이때 결정적인 단서는 “unexpected keyword argument capture_selection”이었습니다. Python은 대응하지 않는 keyword 인자를 호출 시점에 거부하므로 실제 worker 수집을 시작하기 전에 실패할 수 있습니다.[PY-CALL]

호출을 따라가니 route는 CapturePlan에서 selection을 만들고 backend wrapper는 이를 받았습니다. Worker class constructor도 selection으로 hand·gripper·Pika stream을 필터링할 준비가 있었습니다. 하지만 local fallback의 exported start 함수가 인자를 받지 않았고 constructor로도 넘기지 않았습니다. 중간 adapter 하나만 이전 signature에 남은 부분 이행 오류였습니다.

UI는 start 요청 전에 preview를 freeze하고 backend는 preflight·mode·metadata·session 준비를 진행한 뒤 worker를 시작합니다. 마지막 함수 호출에서 실패하면 화면은 이미 starting을 거쳐 복귀하고 runtime frame은 나오지 않습니다. 이를 보고 fishcam USB나 sidecar handler release부터 바꾸면 정확한 예외를 설명하지 못합니다. 해당 sidecar 해제 경로는 Pika 전용 카메라를 제외하므로 대안 가설도 맞지 않았습니다.

현재 entrypoint는 capture_selection을 명시적으로 받고 CaptureWorker로 전달합니다. 이 사건의 테스트 교훈도 분명했습니다. Route 테스트가 start 함수를 lambda **kwargs로 바꾸면 인자 전달 의도는 검사해도 실제 signature mismatch는 잡지 못합니다. Real wrapper/entrypoint는 남기고 무거운 하드웨어 내부만 대체해야 이 경계가 검사됩니다.

### 9.2 Runtime Log: Restore the Control Baseline, Then Unify the Observation Source

[그림: Figure 11. 실패한 첫 접근의 control hot-path 계측과, app-layer observer·비동기 writer·동일 persisted source를 사용하는 최종 native log 경로를 비교했습니다. 외부 runtime 로그에는 별도의 권위 있는 source 경로가 있습니다.]

Figure 11. 실패한 첫 접근의 control hot-path 계측과, app-layer observer·비동기 writer·동일 persisted source를 사용하는 최종 native log 경로를 비교했습니다. 외부 runtime 로그에는 별도의 권위 있는 source 경로가 있습니다. 크게 보기 ↗

처음에는 run_requested·run_started 몇 줄 뒤로 로그가 보이지 않았습니다. Worker tick이 입력·추론·로봇 RPC를 끝낸 뒤 publish하고, status가 cache 부재 시 live RPC fallback을 타며, frontend가 in-flight refresh를 버리는 문제가 겹쳤습니다. Heartbeat·경량 status·refresh queue·cache 갱신을 각각 보강했지만 전체 문제는 끝나지 않았습니다.

Package의 inference/control 근처에서 로그 publish를 늘린 첫 시도는 로봇 동작 회귀로 이어졌습니다. 정상 기준선으로 돌아가 control hot path를 보존하고, app route의 lifecycle과 memory snapshot을 관찰하는 journal로 다시 구성했습니다. Writer는 queue로 분리하고 실패가 run 상태를 깨뜨리지 않게 했습니다. Lock·service 객체를 shared snapshot에 넣지 않는 것도 deepcopy·JSON 계약을 지키는 조건입니다.

두 번째 접근에서도 파일에는 로그가 쌓이는데 UI는 초기 줄에 머무는 현상이 남았습니다. Polling 주기만의 문제가 아니라 UI와 파일이 서로 다른 log source를 읽는 구조였습니다. 최종 native 경로는 active persisted log → 전용 log endpoint → 패널 render로 맞췄습니다. 현재 구현은 persisted 우선이며 필요 시 memory fallback을 사용하고, external runtime의 권위 있는 log는 별도 분기로 취급합니다.

진단은 새 문제를 만들면 안 됩니다. Operator UI에서 로그가 보이게 하려고 hardware RPC를 추가하거나 last_output의 의미를 바꾸면 관찰 대상 자체를 교란합니다. 파일 line sequence, API 응답과 화면이 같은 source를 읽는지 대조한 것이 반복적인 polling 수정에서 벗어난 전환점이었습니다.

### 9.3 Regression Strategy: Keep the Boundary Under Test

사건별 확인 범위
| 대상 | 검사할 불변 조건 | 분리할 검증

| Owner·camera | 저장 identity·order와 실제 target 대응 | 카드 표시와 실물 동작

| Readiness | 동일 selection·손상 파일 보고·변환 후 selected key | raw 준비와 worker launch

| Sidecar | source manifest의 media 대응 | 경로 존재와 영상 decode·정렬

| Mixed output | pose decode 후 손 slice 보존 | tensor shape와 의미

| Resume·queue | 선택 run 복원·active/pending 상태 전이 | mock lifecycle과 실제 GPU 학습

| Worker facade | 실제 exported 함수에 새 keyword 전달 | route intent test와 경계 integration test

| Log | writer 실패 격리·파일/API line 일치 | 관찰 경로와 제어 주기

코드 검사와 fixture는 특정 경계의 계약을 반복해서 확인하는 수단입니다. 실제 장치에서는 연결·입력 변화·최종 target·동작·종료를 나눠 확인했습니다. 회귀 검사에서 fake video나 stub training job을 쓴 경우 그 검사가 입증하는 것은 경로 해석과 상태 전이지, 영상 품질이나 학습 성능이 아닙니다.

한 수정이 정상 경로를 바꾸지 않는지도 같이 봤습니다. TE off의 기존 queue-drain, legacy 단일 로봇 데이터, 기존 camera profile, 명시 owner가 있는 gripper routing을 보존해야 했습니다. 수정한 기능만 성공하는 것과 시스템의 기존 사용 조건을 유지하는 것은 다른 완료 기준입니다.

### 9.4 Engineering Note: Fix the Assumption That Made the Failure Possible

안정화를 하며 바뀐 기준은 “어디서 에러가 났는가”보다 어느 경계에서 값의 의미가 바뀌었는가를 묻는 것이었습니다. 카메라가 끊겨 보이는 현상은 호출 signature에서, 학습 실패는 epoch 뒤 저장에서, 로그 정지는 source 분리에서 시작됐습니다. 화면의 마지막 증상만 고치면 원인을 남겨두게 됩니다.

또한 첫 수정이 맞아 보여도 충분한지는 별개였습니다. 조그 입력을 읽어도 pose 합성이 빠질 수 있고, 파일을 저장해도 UI가 다른 source를 읽을 수 있으며, 전달 테스트가 통과해도 실제 entrypoint는 새 인자를 거부할 수 있습니다. 이후에는 변경이 통과해야 하는 실제 경계와, 테스트가 대체해 버린 경계를 먼저 확인하게 되었습니다.

마지막으로 실패를 허용하는 방식도 설계라는 것을 배웠습니다. 읽을 수 없는 episode는 대상 파일을 밝힌 blocker로, 없는 owner는 임의 target 대신 거부로, 오래된 mode는 live state와 대조하는 전환으로 다뤄야 했습니다. 단순히 예외를 지우는 것보다 정상 계약을 복원하고 다음 사람이 같은 실패를 구분할 수 있도록 남기는 일이 중요했습니다.

## References

- [PY-CALL] Python Language Reference — Calls
함수 signature와 keyword 인자 바인딩의 원리. PikaSense 사건의 원인은 별도의 실제 호출 경로 대조로 판단했습니다.

- [PY-JSON] Python Library Reference — JSON encoding
기본 변환 대상과 default hook의 의미. 실제 resume-state 저장 수정은 본문에서 구분합니다.

CONTINUE READING

## Related Records

Technical Report

### Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.
↗

Technical Report

### Robot Replay·안전 로직

HDF5 기록을 로봇에서 재생하고, 초기 자세 정렬과 본 재생을 분리했습니다.
↗

Technical Report

### 런타임 로그·실행 상태 진단

제어 경로의 회귀를 피하면서 로그 기록과 운영 화면의 표시 원천을 정리했습니다.
↗

Technical Report

### XR 컨트롤러 응용

Quest/Pico의 pose 조작에 축 매핑 조그·analog 그리퍼·버튼 기반 수집과 모드 전환을 연결했습니다.
↗

Technical Report

### Docker·장치 연동

SpaceMouse·카메라의 직접 접근과 Vive·Quest/Pico의 Host VR bridge를 Docker 배포에 연동·안정화했습니다.
↗
