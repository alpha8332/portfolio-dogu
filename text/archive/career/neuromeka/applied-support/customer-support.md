# 기업·연구 지원 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/applied-support/customer-support.html

TECHNICAL REPORT

# 기업·연구 지원

삼성SDI 실행 조건 정리, KAIST 모델의 16D rotvec 출력 계약과 로봇 명령 연동.

DocumentationRobot Control

MY ROLE
실행 환경·절차 전달 · 제공 모델 출력 변환 · 진단 조건 정리

DOCUMENT
Technical Report

삼성SDI 작업의 로봇·Vive 실행 조건을 정리하고, KAIST 연구팀이 제공한 모델의 출력 표현을 MiMicX 로봇 명령으로 연결했습니다. 운영 준비·adapter 구현·문제 조사에서 서로 다른 책임을 구분했습니다.

## 1. 지원 역할과 기업 실행 준비

### 1.1 환경 준비·연구 데이터·모델 실행의 역할

삼성SDI 작업에서는 로봇과 Vive의 실행 준비 조건을 정리했고, KAIST 연구 지원에서는 demonstration 수집과 카메라·관절 정보 전달, 학습 모델의 실행 연동을 다뤘습니다. 같은 플랫폼을 사용해도 필요한 지원의 접점은 달랐습니다.

지원 단계와 담당 범위
| 구간 | 내가 수행한 일 | 구분할 영역

| 기업 작업 운영 | 실행 조건·양팔 API 확인과 사용 순서 정리 | 작업별 성적은 실험 보고서

| SCDP 데이터 | Bin Picking·칠판 닦기·컵 분리 demonstration 수집 | 모델 설계·학습은 연구팀

| 센서·상태 전달 | PSF에서 camera 정보·초기 관절 의미 확인·추출 | 새 calibration 알고리즘 개발과 구분

| 외부 모델 실행 | 제공 output을 로봇 명령 계약에 맞추는 adapter | 연구 모델 자체를 개발·학습한 것은 아님

### 1.2 로봇 구동 조건과 Vive 연결 조건을 분리

[그림: 당시 삼성SDI 운영 순서를 기능 경계로 다시 그렸습니다. 로봇 구동과 입력 runtime의 준비가 합쳐진 뒤 양팔 command의 최소 경로를 확인합니다. 특정 LED 표시는 버전별 관찰 수단입니다.]

당시 삼성SDI 운영 순서를 기능 경계로 다시 그렸습니다. 로봇 구동과 입력 runtime의 준비가 합쳐진 뒤 양팔 command의 최소 경로를 확인합니다. 특정 LED 표시는 버전별 관찰 수단입니다. 크게 보기 ↗

로봇 측에서는 제어기·framework 구동과 servo 상태, pendant의 수동/자동 mode를 확인하도록 했습니다. 입력 측에서는 SteamVR에서 Vive controller와 station이 연결되는지 확인했습니다. 두 경로 중 하나만 준비돼도 teleoperation이 시작되지 않을 수 있어 점검 순서를 나누었습니다.

실행 환경의 framework package 버전과 pendant 표시를 함께 정리했습니다. 표시는 버전에 따라 달라질 수 있으므로 현재 실행 상태를 설명하는 관찰 수단으로 다뤘습니다. 운영 안내에서는 현재 제어 mode와 유효 입력이 핵심 조건임을 설명했습니다.

### 1.3 양팔 SDK 최소 경로와 task 수행의 차이

구동 전 점검에서는 설치된 SDK의 양팔 API와 연결 상태, 양팔 task pose가 telemetry에 들어오는지 확인했습니다. 각 arm_index에 현재 pose를 보내는 호출과 stop 경로도 점검했습니다. 이는 양팔 명령의 최소 경로가 통과한다는 의미이며 병뚜껑의 접촉 작업을 성공했다는 의미는 아닙니다.

당시 데이터에는 길이 22의 관절 배열과 길이 12의 task pose가 있었고, task pose는 6개 값씩 두 팔로 나누었습니다. 관절 배열 전체를 단순히 두 개의 6축 팔로 나누거나, tool_index와 arm_index를 같은 대상이라고 추정하지 않고 각 명령의 소유자를 구분해야 했습니다.

Bottle Cap Opening — 실제 교시와 접촉 단계 →

## 2. 연구 모델과 로봇 명령의 계약

### 2.1 연구팀이 학습한 모델을 실제 플랫폼에 연결

연구 지원에서는 수집한 demonstration과 장치 정보를 전달한 뒤, 연구자가 학습해 제공한 모델을 MiMicX에서 실행하도록 연결했습니다. 카메라·초기 자세를 공유하는 일과 모델의 출력 계약을 변환하는 일은 각각 입력과 출력의 의미를 맞추는 작업이었습니다.

SCDP의 task별 수집과 카메라 좌표 설명은 실험 보고서에 정리했습니다. 여기서는 외부 모델이 기존 로봇 명령으로 들어오기 직전에 어떤 조정이 필요했는지 다룹니다.

KAIST / SCDP — 수집과 관측 정보 전달 →

### 2.2 실제 16D 출력과 이전 22D wrapper의 불일치

[그림: 제공 정책→adapter→MiMicX command builder→로봇 API의 변환 경계. 연구 모델의 출력 표현을 기존 backend의 절대 pose 계약으로 맞추고, 실제 dispatch 책임은 backend에 유지했습니다.]

제공 정책→adapter→MiMicX command builder→로봇 API의 변환 경계. 연구 모델의 출력 표현을 기존 backend의 절대 pose 계약으로 맞추고, 실제 dispatch 책임은 backend에 유지했습니다. 크게 보기 ↗

v4 checkpoint와 pre/postprocessor는 16차원 출력을 사용했지만 manifest와 adapter에는 이전 22차원 설정이 남아 있었습니다. 이전 torso slice는 더 이상 유효하지 않았고, 양팔 회전의 세 값도 기존 RPY degree가 아니라 rotvec delta rad였습니다. 배열 크기만 줄여서는 회전의 의미가 맞지 않았습니다.

제공된 16D action layout · 0-based half-open slice
| 구간 | 의미 | 로봇 실행에서의 처리

| [0:2] | 두 그리퍼 force target | 소유자별 force 명령

| [2:4] | 두 그리퍼 position target | 소유자별 개폐·위치 명령

| [4:7] / [7:10] | 왼팔 dpos / drotvec | 현재 위치·회전에 변화량 적용

| [10:13] / [13:16] | 오른팔 dpos / drotvec | 같은 정의로 오른팔 변환

| 이전 [16:22] | v4에는 없는 torso 구간 | 기존 mapping에서 제거

### 2.3 Rotvec delta를 절대 pose로 복원

위치 변화는 현재 위치에 더하고, 회전벡터는 회전행렬로 바꿔 현재 회전과 합성했습니다. 제공 모델의 정의가 R_delta = R_next · R_current⁻¹이므로 R_next = R_delta · R_current입니다. 곱 순서는 회전 변화량이 어느 좌표계 기준인지에 달려 있어 임의로 뒤집을 수 없었습니다.

pnext=pcurrent+Δp동일 좌표계·단위에서 위치 변화량 적용
Rnext=RdeltaRcurrent,Rdelta=RotvecToMatrix(Δr)제공된 회전 변화량 정의에 따른 합성
Δr은 회전벡터[rad]이고 R은 3×3 회전행렬입니다. 마지막에 R_next를 로봇 API의 RPY convention에 맞는 degree 값으로 변환해 위치[mm]와 묶은 절대 pose6를 전달했습니다. position delta 역시 현재 위치와 같은 좌표·단위로 맞춘 뒤 더해야 합니다.

rotvec의 세 값과 RPY의 세 값은 크기가 같아도 서로 바꾸어 넣을 수 없습니다. manifest의 차원·slice 정정과 adapter의 의미 변환을 함께 해야 기존 backend의 absolute teleop command를 재사용할 수 있었습니다.

## 3. 실행 경로와 문제 조사

### 3.1 Inspect·환경 준비·Preview·Dry Run·실행을 구분

기존 외부 모델 실행 경로의 단계
| 단계 | 확인하는 것 | 아직 보장하지 않는 것

| Inspect | manifest·artifact·IO·entrypoint·의존성 정의 | 실제 추론·실물 동작

| Prepare Env | 선택 정책의 실행 환경 준비 | 현재 로봇 입력의 적합성

| Mapping Preview | 현재 관측의 source·shape·camera와 출력 대상 | 정책을 실행한 결과

| Dry Run | adapter import·제약된 입력/출력 점검 | 실물 task 성공

| Load / Run | worker 유지·모델 추론 loop | task teleop와 dispatch gate 통과 여부

| Stop | loop 중지와 소유한 실행 경로 정리 | 이전 실행의 결과를 소급 검증

adapter는 모델의 전처리·후처리·단위·표현 변환을 담당하고, robot SDK 연결·camera 소유·실제 명령 전송은 backend가 담당하도록 경계를 유지했습니다. 모델이 출력했다는 사실과 로봇에 명령이 발행됐다는 사실을 나누어 볼 수 있어야 했습니다.

### 3.2 표시 이름이 같은 모델의 실행 대상을 구분

후속 실행에서는 여러 bundle이 manifest 내부 id/name을 공유해 모델을 구분하기 어려운 문제가 있었습니다. 선택한 폴더·artifact·실행 환경과 화면 이름을 함께 확인해야 하며, 표시 이름 하나만으로 실행 대상을 판단할 수 없었습니다.

이 문제를 bundle의 실행 identity와 manifest 설명 identity를 구분하는 요구로 정리했습니다. 현행 runtime도 load된 모델의 id뿐 아니라 model_dir, device, options와 환경 선택을 비교합니다. 이름이 같더라도 이전 worker를 재사용해도 되는지 판단할 기준이 필요했습니다.

### 3.3 현재 상태·모델 입력·출력·명령을 따로 관찰

로봇 움직임이 이상할 때 구분한 데이터
| 관측 | 의미 | 문제 분리의 질문

| Robot pose / joint | 현재 로봇의 측정 상태 | 실제로 로봇이 어떤 자세인가

| Model input | adapter에 전달한 관측 | 정책이 기대한 순서·단위·시점인가

| Action | 모델이 생성한 출력 | 추론부터 이미 다른 값인가

| Command | backend가 변환한 dispatch 후보·목표 | mapping·pose 복원에서 달라졌는가

| Timing / freshness | 추론·dispatch 시간과 입력 나이 | 느린 계산과 오래된 입력을 구분했는가

| 물체·영상 | 실제 접촉과 task 단계 | 숫자상 이동이 물체 조작으로 이어졌는가

실행 중 teleop command만 보면 정책 입력이 잘못됐는지, 모델이 다른 행동을 냈는지, 변환 과정에서 달라졌는지 구별하기 어려웠습니다. 그래서 현재 pose·joint·모델 입력과 Action·Command·Timing을 함께 관찰할 수 있는 진단 정보를 요구했습니다. 그래프·영상의 run별 저장도 같은 실행을 다시 비교하기 위한 요구로 정리했습니다.

같은 실행을 비교하려면 선택 모델·관측 stream·원본 output·변환 명령과 시간 관계를 묶어야 합니다. 실행 결과를 다시 조사할 수 있도록 어떤 값이 필요한지 구체화하는 과정도 지원 업무에 포함됐습니다.

### 3.4 변환 검토와 실물 실행 확인의 역할

변환을 검토할 때는 16D slice의 좌우·gripper 대응, 회전벡터 0에서 현재 회전을 유지하는 경우, 축 회전의 곱 순서, 최종 pose6의 단위를 나누어 보았습니다. 이런 경계 검사는 모델의 새로운 task 성공률을 측정하는 시험과 다릅니다.

계약을 조정한 adapter를 적용해 실제 로봇의 변환·명령 동작을 확인했습니다. 여기서 확인한 결과는 제공된 출력이 기존 API의 의미로 연결되는 것이며, 연구팀의 모든 학습·평가 task를 대신 검증한 것으로 확대하지 않았습니다.

External Model Rollout — 공통 실행 구조와 adapter 상세 →

## 4. 인수인계와 Engineering Note

### 4.1 다음 사람이 비교할 수 있는 조건으로 전달

연구자에게 camera intrinsic/extrinsic과 초기 관절 순서의 의미를 전달하고, 구현에서는 모델의 출력 차원·단위·회전 정의를 기존 명령과 맞추었습니다. 양쪽 모두 숫자만 전달해서는 같은 상태를 해석할 수 없다는 공통점이 있었습니다.

문제 전달에서는 선택 bundle·artifact·입력 구성, 실제 상태와 모델 입출력, 기대와 달라진 시점을 나누어 남깁니다. 로봇이 흔들린다는 현상만으로 원인을 결정하기보다 어느 경계에서 값의 의미가 달라졌는지 비교할 수 있는 정보가 필요했습니다.

### 4.2 Engineering Note

16개의 숫자가 나왔다는 사실과 그 숫자로 로봇을 움직여도 된다는 판단은 달랐습니다. 회전은 세 값으로 표현돼도 rotvec rad와 절대 RPY degree가 전혀 다른 명령이었습니다. 연동에서 맞추어야 하는 것은 배열 크기만이 아니라 값의 의미·단위·기준 좌표와 실행 책임이라는 점을 배웠습니다.

또한 command만 보고 움직임을 설명하려 하면 입력부터 달라진 문제를 놓칠 수 있었습니다. 상대가 원인을 다시 조사할 수 있도록 관측·변환·명령·실물을 나누어 전달하는 것이 기술 지원의 중요한 부분이라고 느꼈습니다.

CONTINUE READING

## Related Records

Technical Report

### 외부 모델 실행 연동 — SCDP

연구팀의 SCDP 모델을 MiMicX에서 실행: 16D rotvec adapter·입출력 계약·좌표 변환과 실로봇 확인.
↗

Technical Report

### 기술 문서화·인수인계

기존 시스템을 이해한 내용을 온보딩·아키텍처·운영·진단 문서로 정리하고 전달했습니다.
↗
