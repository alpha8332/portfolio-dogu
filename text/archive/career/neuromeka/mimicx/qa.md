# Dataset QA · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/mimicx/qa.html

TECHNICAL REPORT

# Dataset QA

선택한 episode의 저장·시각화·학습 입력을 대조하는 내부 Dataset QA Checklist를 개발했습니다.

HDF5Dataset QAVisualization

MY ROLE
내부 데이터 검수 도구 · 판정·대상 일치 보완

DOCUMENT
Technical Report

수집 완료 표시만으로 손·그리퍼·카메라 정보가 학습까지 남는다고 볼 수 없습니다. 실제 raw episode를 기준으로 장치 조합별 저장·표시·변환 계약을 검사하는 개인용 Dataset QA Checklist를 개발했습니다.

Capture Plan부터 Training Schema까지 같은 episode를 따라가며 손이 없어도 pass가 되던 판정, 선택과 다른 파일 검사, 영상 sidecar의 참조 누락을 해결했습니다.

## 1. 문제·구성·저장 계약

### 1.1 수집 성공과 학습에 쓸 수 있는 기록 사이의 간극

로봇을 움직이며 Data Collection을 완료해도 저장된 파일이 의도한 장치 정보를 담고 있다는 보장은 없었습니다. Tesollo 손이 연결돼 있어도 raw HDF5에는 손의 관절·상태가 빠지고 기존 그리퍼 placeholder만 남을 수 있었습니다. 화면의 수집 성공 표시와 학습 입력의 완전성을 같은 것으로 취급하면, 데이터 변환이나 Replay 단계에서야 누락을 발견하게 됩니다.

이 문제를 확인하기 위해 제가 사용할 내부 Dataset QA Checklist를 신규 개발했습니다. Backend report builder, API, 장치 조합별 profile, evidence를 펼치는 UI와 관련 화면 이동을 연결했습니다. 기존 수집·시각화·변환 기능을 교체하기보다, 이 기능들이 같은 episode를 서로 다르게 해석하는 지점을 한 번에 비교하는 도구로 만들었습니다.

Checklist는 실제 수집 데이터 검증에 활용한 개인 QA 도구입니다. 기본 배포 화면에는 진입 버튼을 숨기고 API와 UI hook을 유지했습니다. 여기서는 당시 사용한 legacy hand runtime 스키마와 GG·GT·TT 조합을 중심으로 설명합니다. 현재 플랫폼 전체의 모든 장치·모델 조합을 인증하는 기능으로 넓혀 설명하지 않습니다.

### 1.2 한 episode를 여섯 관점에서 교차 검사하는 구조

[그림: Figure 1. 선택한 episode와 profile을 고정하고 Capture Plan, Raw H5, Graph, Table, Integrity, Training Schema의 계약을 교차 확인하는 구조입니다. 원본 UI 캡처 대신 공개 설명용으로 다시 그렸습니다.]

Figure 1. 선택한 episode와 profile을 고정하고 Capture Plan, Raw H5, Graph, Table, Integrity, Training Schema의 계약을 교차 확인하는 구조입니다. 원본 UI 캡처 대신 공개 설명용으로 다시 그렸습니다. 크게 보기 ↗

브라우저가 선택한 dataset 식별자와 profile을 보내면 API가 해당 항목의 raw HDF5 경로를 해석합니다. Report builder는 그 경로를 raw schema 검사, plot payload, sample table, integrity 분석과 변환 schema 추론에 전달합니다. Task 경로는 계획·메타데이터를 찾는 맥락이고, 실제 검사할 episode의 선택을 대신하지 않습니다.

여섯 검사 구간이 답하는 질문
| 구간 | 읽는 대상 | 확인하는 것

| Capture Plan | 선택 stream row와 persisted key 선언 | 저장하려던 장치·채널이 실제 raw key로 이어지는가

| Raw H5 | 실제 key·shape·runtime ID | 필요한 장치가 존재하고 profile의 keyset을 갖는가

| Graph | 선택 H5의 plot series | 그리퍼·손·FT·카메라 valid를 그래프로 볼 수 있는가

| Table | 같은 H5의 sample column | 구체적인 telemetry·command·timestamp·valid 열이 노출되는가

| Integrity | sample timeline과 device health | 분석할 sample과 장치 진단 row가 생성되는가

| Training Schema | 같은 H5에서 추론한 canonical key | profile에 필요한 split gripper alias가 생기거나 제거되는가

같은 자료를 여섯 번 반복 확인하는 것은 아닙니다. 저장 계획은 의도, H5는 실제 산출물, Graph와 Table은 해석 결과, Training Schema는 downstream 계약입니다. 어느 경계에서 의미가 사라졌는지를 찾기 위해 관점을 나눴습니다.

### 1.3 GG·GT·TT: 장치 조합을 기대 계약으로 표현

당시 지원한 profile
| Profile | Binary gripper target | 실제 Tesollo runtime 수 | Training gripper alias

| Gripper–Gripper / GG | 필요; position·force 각각 폭 2 | 0 | left/right alias 필요

| Gripper–Tesollo / GT | 필요; 기존 2채널 계약 유지 | 1 | left/right alias 필요

| Tesollo–Tesollo / TT | legacy binary key 없어야 함 | 2 | binary alias 없어야 함

GT라고 해서 binary 배열의 폭을 1로 가정하지 않았습니다. 기존 양팔 저장·변환 계약은 position target과 force target을 각각 두 채널로 유지합니다. 반면 Tesollo는 단순 open/close 값으로 대체하지 않고 손 runtime별 관절·명령·시간 정보를 따로 검사합니다. 장치 개수와 배열 폭은 서로 다른 조건입니다.

Task명 끝의 _gg, _gt, _tt로 profile을 자동 선택하도록 했고 UI에서 조합을 바꿀 수도 있게 했습니다. 이 suffix는 기대하는 구성을 선택하는 편의 기능입니다. 이름만 TT라고 실제 손 두 개가 저장됐다고 인정하지 않고, raw에서 발견한 runtime 수와 비교합니다. 잘못 선택한 profile은 데이터 오류와 구분해 먼저 확인해야 합니다.

### 1.4 Capture Plan의 선언을 실제 저장 key까지 추적

Capture Plan에는 선택한 stream row와 그 stream이 저장해야 할 key가 있습니다. Plan에 Tesollo telemetry row가 있으면 실제 H5에 대응 runtime key가 있는지 대조했습니다. Wildcard 형태의 선언은 저장 prefix로 확장해 확인하고, 발견된 key와 누락된 key를 evidence에 함께 남겼습니다.

Plan을 읽을 수 없는 구형 task는 그 사실을 warn으로 표시합니다. Plan 부재만으로 실제 데이터가 비었다고 단정하지 않는 대신, raw inventory와 나머지 검사 결과를 계속 보게 했습니다. 반대로 Plan이 있어도 선언만으로 pass를 주지 않습니다. 계획의 존재와 데이터의 존재는 별도의 증거이기 때문입니다.

이 검사는 저장 이름 계약을 연결하는 검사입니다. Prefix가 발견됐다고 모든 payload 값이 정상이라는 뜻은 아닙니다. 따라서 결과에는 기대 key, 발견 key, shape를 남겨 어떤 실체가 조건을 만족했는지 다시 볼 수 있게 했습니다.

### 1.5 손 telemetry와 gripper placeholder를 분리한 저장 계약

Tesollo runtime별 필수 suffix
| 구분 | 필수 key suffix | 의미·단위

| Feedback | feedback.joint_pos_deg / feedback.joint_vel_deg_s | 측정 관절 위치 deg / 속도 deg/s

| Command | command.grasp_state / command.grasp_mode_id / command.grasp_force | 발행한 grasp 상태·mode·force 설정

| Time / validity | timestamp / valid | 장치 sample 시각과 유효 여부

각 runtime은 hand.tesollo.<runtime>.* 아래의 일곱 필수 항목을 갖도록 검사했습니다. 위치 feedback과 grasp command는 다른 정보입니다. 손의 실제 관절 상태를 명령의 이름으로 대체하거나, 이 keyset이 통과했다고 모든 joint 명령의 의미까지 검사했다고 말할 수는 없습니다. 이 Checklist의 필수 목록에는 command joint-position 전체 검사가 들어 있지 않습니다.

수집 경로도 함께 보강했습니다. Hand Teleoperation이 active가 아니어도 설정된 Tesollo가 있으면 cached telemetry 또는 직접 feedback fallback을 통해 raw에 손 상태를 남기도록 했습니다. TT 수집에서는 기존 control.gripper placeholder를 생성하지 않고 손별 key를 보존했습니다. 손 조작 UI의 활성 상태를 데이터 저장 여부와 같은 조건으로 묶지 않은 것입니다.

Grasp mode가 실제로 선택돼 있는데 저장값은 계속 −1인 문제도 수정했습니다. 31·32·33 등 실제 mode가 보존돼야 나중에 동작을 해석할 수 있습니다. −1은 “다른 파지 방식”이 아니라 mode 정보가 전달되지 않았다는 신호일 수 있으므로, raw 숫자의 존재만 확인해서는 충분하지 않았습니다.

Tesollo Hand 학습 파이프라인 — 관절·grasp·학습 계약 →

## 2. False pass와 표시 경계

### 2.1 실제 손이 없는 데이터를 pass로 보였던 문제

[그림: Figure 2. 위는 저장 계획을 실제 telemetry로 오인한 false pass, 아래는 같은 task의 첫 파일과 선택한 episode가 다른 문제입니다. Episode 구성은 회귀 fixture의 차이를 설명한 예시입니다.]

Figure 2. 위는 저장 계획을 실제 telemetry로 오인한 false pass, 아래는 같은 task의 첫 파일과 선택한 episode가 다른 문제입니다. Episode 구성은 회귀 fixture의 차이를 설명한 예시입니다. 크게 보기 ↗

TT profile의 Capture Plan에 손 두 개가 선언돼 있어도 raw에서 runtime ID가 하나도 발견되지 않는 경우가 있었습니다. 이때 “발견한 모든 손의 key가 갖춰졌다”는 검사만 하면 빈 목록에 대한 검사 결과가 참이 되는 문제가 생깁니다. 검사할 대상 자체가 없는 경우를 정상으로 판단한 것입니다.

수정은 두 단계였습니다. 먼저 실제 raw에서 발견한 runtime 수가 profile과 맞는지 확인하고, 그 다음 실제 runtime이 하나 이상 존재하며 각 필수 key가 모두 있는지 확인했습니다. Plan에서 얻은 ID는 누락 원인을 설명하는 데 쓸 수 있지만, 실제 저장된 runtime 수를 대신하지 못하게 했습니다.

TT인데 raw 손 key가 없으면 Raw H5의 runtime count와 keyset이 fail하고, 손 관절·속도·명령을 찾는 Graph와 Table도 fail하도록 회귀 fixture에 남겼습니다. 수집 완료 표시, Plan, Checklist가 서로 동의하는 것보다 실제 H5가 기대 계약을 충족하는지가 먼저였습니다.

### 2.2 Graph와 Table: 존재·분류·구체 열을 다른 방식으로 확인

Graph는 gripper, hand joint, hand joint velocity, hand command, FT, camera valid series가 생성되는지 봅니다. Table은 같은 H5를 이미지 없이 sample payload로 읽고 실제 열 이름을 모읍니다. 손 필수 key뿐 아니라 FT wrench·timestamp·valid와 카메라 timestamp·valid가 표시되는지도 확인합니다.

개발 중에는 hand_joint_vel_*가 hand_joint_*와 비슷한 이름 때문에 위치 그룹으로 섞이는 문제가 있었습니다. 위치와 속도를 별도 그룹으로 나눴습니다. 다만 현재 Checklist의 series 존재 helper에는 넓은 prefix matching이 남아 있어, label 하나가 pass라고 모든 series의 물리 의미가 검증된 것은 아닙니다. Evidence의 구체 key와 실제 그래프를 같이 봐야 합니다.

Graph에 값이 보이는 것과 그 값이 정상적인 범위·연속성·좌우 소속을 갖는 것도 별도입니다. 이 단계의 자동 판정은 series와 column을 찾아볼 수 있는지에 집중했습니다. 진폭, 누락 구간, 명령과 feedback의 차이는 해당 화면에서 직접 확인하도록 연결했습니다.

## 3. 시간·갱신·판정 근거

### 3.1 Integrity: sample coverage와 실제 update를 구분

파일의 row 수가 많아도 장치 데이터가 매번 갱신됐다고 볼 수는 없습니다. 같은 장치 timestamp의 값이 반복 저장되면 valid는 참인 채로 남을 수 있습니다. Integrity 진단에서는 유효 sample 비율, 누락 연속 길이, timestamp 재사용과 이를 제외한 update 빈도를 구분합니다.

rvalid=NvalidN,fvalid=NvalidTValid coverage / effective frequency
N은 전체 row 수, N_valid는 valid mask가 참인 row 수, T는 마지막 finite sample 시각과 첫 시각의 차이(초)입니다. 비율은 무차원이고 f_valid는 Hz입니다. T가 0이거나 매우 작으면 빈도는 0으로 처리합니다. N개 sample의 관측 구간에는 보통 N−1개 간격이 있으므로 N/T를 일정 주기 sampling rate와 동일시하지 않습니다.

Nupdate=max(Nvalid−Nreused,0),fupdate=NupdateTFresh updates
재사용 판정은 유효한 finite 장치 timestamp를 앞선 유효 timestamp와 비교해 차이가 10⁻⁹초 이내인 경우입니다. Invalid row는 이전 시각을 갱신하지 않습니다. 이 값은 timestamp가 그대로인 row를 구분하는 지표이지, timestamp만 새로 붙은 같은 센서 값까지 찾아내는 검사는 아닙니다.

### 3.2 Clock delta: 정적 offset 제거와 지연 해석의 차이

[그림: Figure 3. 5개 row 중 valid 4개·새 timestamp 3개인 계산 예입니다. 실제 측정 그래프가 아니라 coverage·freshness·offset의 차이를 설명하기 위한 수치입니다.]

Figure 3. 5개 row 중 valid 4개·새 timestamp 3개인 계산 예입니다. 실제 측정 그래프가 아니라 coverage·freshness·offset의 차이를 설명하기 위한 수치입니다. 크게 보기 ↗

δraw,i=1000(tdevice,i−tsample,i)Raw / corrected delta in milliseconds
δi=δraw,i−δraw,firstRemove the first finite baseline
시각은 초로 읽고 차이를 1000배 해 ms로 표시합니다. 처음의 finite한 차이를 빼서 시작 시점의 정적인 offset을 제거한 변화를 봅니다. 예를 들어 −100 ms에서 −120 ms로 바뀌면 보정 후에는 −20 ms입니다. 처음 차이를 0으로 만들었다고 두 시계가 물리적으로 동기화된 것은 아닙니다.

Monotonic timestamp를 우선하고 사용할 수 없으면 wall timestamp를 사용합니다. 어떤 clock을 비교했는지 offset_source로 남깁니다. 서로 다른 시계의 원점 차이나 timestamp를 붙이는 위치를 포함하는 delta를 그대로 카메라의 단방향 통신 지연이라 부를 수는 없습니다. 보정 후 p95/p99도 부호가 있는 delta의 분위수이며 절대 오차의 상한이 아닙니다.

Sample 자체의 주파수는 finite하면서 양수인 인접 간격마다 1/Δt를 계산해 평균합니다. 이는 장치별 valid_count/T와 다른 정의입니다. 목표 Hz, 실제 sample 간격, 장치의 fresh update를 구분해 수집 loop와 센서 갱신 중 어느 쪽에 문제가 있는지 살폈습니다.

### 3.3 근거를 펼쳐 보는 pass/fail/warn

결과의 표시 계약
| 항목 | 설계 의도

| Status | 항목별 pass/fail/warn. Fail을 최우선, 다음 warn으로 상위 집계

| Message | 무엇을 충족했고 무엇이 빠졌는지 짧게 설명

| Details | Expected / Found / Missing key, shape, runtime ID를 펼쳐 표시

| Target | Graph / Table / RGB Preview / Integrity / Training으로 이동

| Summary count | 판정한 check item 수. 데이터 sample 수나 불량률이 아님

Fail 표시만으로는 profile을 잘못 골랐는지, 저장이 빠졌는지, 표시할 수 없는지 알기 어렵습니다. 그래서 항목별 evidence에 기대값과 실제 값을 나란히 놓았습니다. 검사 결과에서 원래 신호로 돌아갈 수 있도록 하고, RGB Preview도 자동 화질 판정이 아닌 수동 확인 링크로 연결했습니다.

Integrity section의 Checklist 판정은 sample 수와 장치 row의 존재 확인입니다. valid_ratio나 p95에 합격 임계값을 적용한 것은 아닙니다. Graph의 series 존재 검사도 마찬가지입니다. 구조의 pass를 품질이나 동기화 성능의 pass로 읽지 않도록 하는 것이 항목을 늘리는 것 이상으로 중요했습니다.

## 4. 선택 episode와 학습 준비

### 4.1 Training Schema가 다른 episode를 보던 문제

Training Schema가 현재 선택한 episode가 아니라 task의 첫 0000.h5를 검사하는 문제가 있었습니다. 같은 task라도 수집 당시 장치 구성이 다르면 key가 다릅니다. UI는 0001을 가리키는데 판정은 0000에 대해 수행하면, 올바른 검사식을 적용해도 결과가 다른 데이터를 설명하게 됩니다.

Raw schema와 변환 schema 추론 모두에 API가 해석한 같은 h5_path를 전달하도록 했습니다. 회귀 fixture에서는 0000과 0001에 서로 다른 GG/GT/TT 구성을 두고, 0001 선택 시 binary alias의 필요·불필요가 올바르게 바뀌는지 검사했습니다. 같은 folder가 아니라 같은 episode를 읽었다는 사실을 고정한 수정입니다.

### 4.2 학습 키의 성립과 학습 시작 조건을 구분

Binary gripper profile에서는 position target과 force target의 left/right, observation의 prev_gripper_command의 left/right, 총 여섯 alias를 검사했습니다. TT에서는 이 binary alias들이 남아 있지 않은지 확인합니다. Raw에 열이 존재하는 데서 끝내지 않고 변환 후 사용할 이름까지 연결되는지 보기 위한 검사입니다.

이 처리는 선택한 H5의 schema 추론이며 실제 학습 job을 실행한 결과는 아닙니다. 영상 decode, 선택한 전체 episode의 일관성, 모델 입력 조건, 실행할 processed file은 별도로 확인해야 합니다. Checklist의 pass를 Start 허가로 사용하지 않고 Training Readiness와 Start preflight의 판정 경로를 유지했습니다.

Diffusion Policy 연동 — 데이터 계약과 학습 입력 →

### 4.3 RGB sidecar: Preview는 보이는데 변환하지 못하는 이유

[그림: Figure 4. 원본 episode·staged H5·MP4 sidecar·selection manifest의 관계입니다. Checklist와 관련 데이터 변환·학습 시작의 수정 범위를 구분해 표현했습니다.]

Figure 4. 원본 episode·staged H5·MP4 sidecar·selection manifest의 관계입니다. Checklist와 관련 데이터 변환·학습 시작의 수정 범위를 구분해 표현했습니다. 크게 보기 ↗

RGB가 HDF5 내부 image tensor가 아닌 sidecar MP4로 저장되면 schema나 Preview에서 선택할 수 있어도 conversion에서 Missing required keys가 발생할 수 있었습니다. Preview는 원본 episode 옆의 MP4를 읽지만, 학습용으로 materialize한 다른 folder의 H5 옆에는 같은 상대 위치로 영상이 존재하지 않았기 때문입니다.

원본 episode의 source_path와 selection manifest를 따라가도록 바꾸어 staged H5의 부모 folder에만 의존하지 않게 했습니다. 오래된 materialized selection의 manifest가 없거나 stale하면 현재 selection과 동기화하고 sidecar 연결도 복구했습니다. Stream-aligned read가 빈 frame을 반환하면 sequential decode를 재시도하고, 끝내 읽지 못하면 문제 camera/file을 특정하는 정보를 남겼습니다.

하나의 손상 H5가 folder 전체 Readiness를 HTTP 500으로 끝내지 않도록 episode별 block으로 나누고, processed H5의 손상은 worker 시작 전에 차단했습니다. Checklist에 항목만 추가한 것이 아니라, QA에서 찾은 불일치를 저장·해석·학습 시작의 경계에서 바로잡은 관련 작업입니다.

## 5. 검증·Engineering Note

### 5.1 실제 데이터 확인과 회귀 fixture의 조건

검증을 나눈 대상
| 대상 | 구체 조건 | 확인하는 것

| 실제 수집 GG/GT/TT | 당시 장치 구성과 raw episode | Profile별 결과와 실제 key 대조

| 정상 GT API fixture | binary 2ch + Tesollo 1개 | 구조·runtime ID·split alias와 evidence

| Profile mismatch | GT에 해당하는 raw를 GG 기대로 검사 | binary key·runtime 수 차이를 fail로 표시

| TT telemetry 누락 | Plan에는 손 2개, raw에는 0개 | Raw/Graph/Table 누락 판정

| 선택 episode fixture | 0000과 0001의 장치 구성을 다르게 설정 | 선택한 0001의 schema로 판정

| EIR GG/GT/TT fixture | torso pose를 포함하는 구성 | robot 종류가 달라도 profile 계약 유지

실제로 수집한 세 장치 조합의 Checklist 결과를 확인하고 telemetry 누락과 선택 episode 오류를 회귀 조건으로 남겼습니다. Fixture는 API 판정과 payload 구조를 고정합니다. 정상 case뿐 아니라 장치가 없거나 profile이 다르거나 다른 episode를 고른 경우를 함께 확인해, 정상 데이터만 통과시키는지 검증했습니다.

### 5.2 Engineering Note: 녹색 표시보다 같은 실체를 보는가

처음에는 필요한 항목을 늘리면 검사가 강해진다고 생각하기 쉬웠습니다. 하지만 손이 하나도 저장되지 않았는데 pass가 되는 문제에서는 항목 수보다 검사 대상의 존재가 빠져 있었습니다. 선택 episode 문제에서는 검사식보다 무엇을 읽었는지가 잘못됐습니다. 그래서 기대 계약, 실제 대상, 판정 근거를 분리하게 됐습니다.

Sidecar 문제를 통해 데이터가 하나의 파일에 닫혀 있지 않다는 점도 이해했습니다. H5의 열 이름뿐 아니라 원본 episode, 영상, selection, 변환 대상의 관계가 남아야 재사용할 수 있습니다. 파일을 옮길 때에는 byte의 존재뿐 아니라 참조의 의미가 유지되는지 확인해야 했습니다.

Checklist를 학습 gate로 만들지 않은 것도 같은 이유입니다. 탐색하기 쉬운 진단과 특정 시점의 실행 허가는 책임이 다릅니다. 모든 것을 하나의 pass에 넣기보다 무엇을 확인한 pass인지 설명할 수 있는 것이 데이터를 신뢰하고 다시 쓰는 기반이 됐습니다.

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

### 독립 다중 로봇 지원

독립된 Indy12 두 대의 session·소유권·raw schema를 설계하고 수집·학습·추론·시각화·Replay까지 연결했습니다.
↗
