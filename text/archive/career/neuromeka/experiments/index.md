# 모방학습 실험 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/experiments/index.html

WORK AREA

# 모방학습 실험

개인 실험·Samsung SDI·SCDP의 수집 조건과 학습·실행 관찰을 탐색합니다.

Imitation LearningACTSCDPData Collection

MY ROLE
개인 데이터 수집·학습·실행 · 기업 지원 · 연구용 데이터 수집

DOCUMENT
Technical Report

실험 조건을 바꾸어 수집·학습·실로봇 실행을 반복했습니다. 개인 실험, 병뚜껑 열기, 연구용 데이터 수집의 역할과 관찰을 분리하고, 실패에서 다음 수집 조건을 정한 과정을 남깁니다.

업무별 탐색

## 실험 분류

Experiment Collection

### 개인 실험

바나나 버전별 수집, Handover와 양팔 배치, 카메라 조건 변화에 따른 실행 관찰.
↗

Industry Support

### 삼성SDI

병의 지지·뚜껑 축 정렬·회전 교시와 접근 이후 구간을 나눈 학습 시도.
↗

Research Support

### KAIST / SCDP

연구용 demonstration 수집과 카메라·관절 정보 전달, 별도 학습 모델 rollout 연동.
↗

## 1. 실험 흐름과 작업 분류

### 1.1 수집한 동작을 학습된 정책의 실행으로 연결

누리 양팔과 2지 그리퍼로 바나나 Pick & Place와 전달·배치 동작을 직접 교시하고, 수집한 demonstration으로 학습한 모델을 실제 로봇에서 실행했습니다. 관심은 학습이 끝났는지보다 물체 배치와 카메라가 달라져도 접근·파지·이동·놓기의 순서가 이어지는지에 있었습니다.

[그림: 직접 작성한 수집·전처리·학습·실행 경로. 학습 데이터의 시간축과 실제 rollout의 피드백 루프, 실행 후 조건을 바꾸어 다시 수집하는 반복을 구분했습니다.]

직접 작성한 수집·전처리·학습·실행 경로. 학습 데이터의 시간축과 실제 rollout의 피드백 루프, 실행 후 조건을 바꾸어 다시 수집하는 반복을 구분했습니다. 크게 보기 ↗

Demonstration은 사람이 만든 상태·행동의 시간적 대응입니다. 학습에서는 영상과 로봇 상태를 조건으로 행동을 예측하고, rollout에서는 지금 들어오는 관측으로 다음 행동을 다시 계산합니다. 같은 episode를 그대로 재전송하는 Robot Replay와는 실행 입력이 다릅니다.

ACT는 관측을 조건으로 한 번에 여러 미래 step의 행동을 예측하는 action chunking을 사용합니다. 실제 실행에서는 새로 들어오는 관측과 행동 chunk의 연결 방식을 함께 보아야 합니다. 팔의 연속적인 이동과 이산적인 grasp/release가 같은 시간축에서 어떻게 적용되는지가 물체 조작의 결과를 바꾸기 때문입니다.[ACT]

Robot Replay — 기록된 동작의 재실행 →

### 1.2 개인 실험: 고정 배치에서 조건을 나눈 수집으로

처음에는 물체와 트레이 위치를 고정해 동작 연결을 확인했습니다. 이후 바나나의 위치·자세를 바꾸자 비슷한 조건의 중복 수집과 특정 조건의 부족이 함께 나타났습니다. 수집 횟수를 늘리는 것과 작업 공간을 고르게 포함하는 것이 다르다는 점을 경험했습니다.

개인 실험에서 달라진 질문
| 작업 | 주요 질문

| Banana Pick & Place | 어느 위치·자세가 데이터에 포함됐고 어느 조건에서 파지가 어려운가

| Handover Pick & Place | 주는 팔의 release와 받는 팔의 grasp가 어떻게 이어지는가

| Bimanual Object Placement | 양팔의 물체·그리퍼·카메라 대응과 배치 순서를 어떻게 유지하는가

개인 실험 — 버전별 수집과 실행 관찰 →

### 1.3 Samsung SDI: 접근과 회전이 다른 접촉 조작

병뚜껑 열기에서는 오른팔로 병을 지지하고 왼팔로 뚜껑을 잡아 회전시킨 뒤 분리하는 시퀀스를 다뤘습니다. 접근이 가능해도 회전이 이어지지 않는 문제가 있었고, 전체 동작 교시와 접근 이후 구간을 나눈 교시를 비교했습니다. 파지·회전축·교시의 속도 변화가 함께 걸린 작업이었습니다.

Bottle Cap Opening — 동작 설계와 분리 교시 →

### 1.4 KAIST / SCDP: 연구용 demonstration 수집

SCDP 연구 지원에서는 Bin Picking, 칠판 닦기, 컵을 뽑아 놓는 동작의 텔레오퍼레이션 데이터를 수집했습니다. 모델 설계·학습은 연구팀이 담당했습니다. 저는 연구자가 로봇 관측과 행동을 해석할 수 있도록 카메라 정보와 초기 자세의 의미도 전달했습니다.

학습 결과물을 받아 MiMicX에서 rollout하도록 연결한 작업은 데이터 수집과 별도의 업무입니다. 제공 모델의 회전 표현·단위와 로봇 명령 사이의 변환은 External Model Rollout 보고서에 연결합니다.

SCDP — 데이터 수집과 연구 협업 →

## 2. 조건·데이터·평가

### 2.1 실험 버전에서 고정할 것과 바꿀 것

실험을 구별하는 조건
| 경계 | 함께 남긴 정보 | 달라질 때의 영향

| 물리 배치 | 로봇 시작 자세·물체 위치·트레이·파지 상태 | 도달 자세와 성공 동작 자체가 달라짐

| 관측 | 카메라 위치·시점·선택 순서·crop | 같은 물체가 영상의 다른 위치·크기로 들어옴

| 교시 | 속도·정지 구간·grasp/release·reject 기준 | 정책이 모방할 시간적 패턴이 달라짐

| 학습 | 선택 데이터·입출력·relative·보조 label·checkpoint | 같은 task 이름이어도 다른 정책이 만들어짐

| 실행 | 시작 상태·배치·추론 설정·실행 관찰 | loss와 별개로 실제 성공 조건이 달라짐

바나나 위치만 바꾼 실험과 카메라·테이블까지 바뀐 실험을 같은 비교로 해석할 수는 없었습니다. 먼저 실행 환경을 수집 때의 조건으로 맞춘 뒤, 바꾼 조건을 구분해 보아야 정책 문제와 환경 변화를 나누어 볼 수 있습니다.

### 2.2 Raw episode에서 checkpoint까지 유지할 대응

학습 입력의 영상·위치·속도·그리퍼 상태는 관측이고, 출력의 말단 위치·방향·그리퍼는 정책이 생성할 행동입니다. 같은 이름의 배열이어도 현재 측정값과 발행한 명령은 역할이 다릅니다. 학습 전에 어느 팔·카메라·시간 step에 속하는지 유지해야 했습니다.

전처리에서는 crop과 relative 표현, episode의 사용 구간, 끝부분 label을 선택합니다. 현행 MiMicX도 선택 데이터·curation·preprocess 설정을 학습 산출물에 연결합니다. 이는 과거 실험의 화면 이름을 바꾸는 것이 아니라, 당시 바꿔 보았던 조건을 현재 체계에서 다시 추적하는 방법입니다.

MiMicX Platform — 데이터와 실행 계약 →

### 2.3 학습 loss·보조 label·물리적 성공을 구분

양팔 작업에서는 학습 중 loss가 약 0.01이어도 카메라 각도와 테이블 세팅이 달라진 실행에서 실패를 반복했습니다. 학습 데이터에서의 예측 오차가 줄었다는 사실이 새로운 관측 조건에서의 파지·배치 성공을 보장하지 않았습니다.

이전 실험의 is_success 설정값 6·10은 성공 횟수가 아닙니다. 현행 전처리의 success_tail은 episode 끝의 지정 sample 수를 True로 만드는 휴리스틱 label이며, is_progress는 episode 진행도를 나타냅니다. 이 보조 출력과 실제로 물체를 집어 놓았는지를 구분해야 했습니다.

서로 다른 확인 대상
| 값·관찰 | 의미

| Training loss | 해당 학습 목적·데이터에서 계산한 오차

| is_success / is_progress | 학습용 종료 구간 또는 진행도 신호

| 실로봇 영상·관찰 | 접근·접촉·파지·놓기가 실제로 성립했는가

| 조건별 반복 평가 | 고정한 조건에서 성공/실패를 반복 집계한 결과

과거 메모의 잠정 성공률이나 기억에 의존한 수치는 비교표에 확정 성적으로 넣지 않았습니다. 조건·반복 수·실패 판정이 정해진 평가와 단일 실행의 관찰은 구별해 남깁니다.

## 3. Engineering Note

### 3.1 Engineering Note

무작위 수집을 50회 했을 때에도 특정 위치·자세가 빠졌고, 조건을 나누자 무엇을 더 수집할지 설명할 수 있었습니다. 데이터 양보다 먼저, 로봇에게 어떤 상황을 보여 주었는지 설계해야 한다는 점을 배웠습니다.

또한 병뚜껑의 접근과 회전, 양팔 작업의 카메라 변화는 서로 다른 실패였습니다. 실패를 하나의 성공률이나 loss로 줄이면 다음 수정이 막연해집니다. 관측 조건, 교시의 시간적 형태, 접촉 단계로 나누어 보아야 다시 수집할 것과 실행에서 고칠 것을 구분할 수 있었습니다.

## References

- [ACT] Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware — ACT
ACT 원 논문과 공식 구현. 정책의 원리와 이번 실험 조건을 구분합니다.

- [SCDP] Spatially Conditioned Diffusion Policy — Official Project
지원 연구의 모델 원리. 논문의 학습·평가 결과는 연구팀의 결과입니다.

- [ACT-PAPER] ACT — Original Paper
Action chunking의 원 논문. 본인 실험의 성능 수치로 사용하지 않습니다.

- [ACT-CODE] ACT — Official Implementation
논문 저자의 공개 구현.

- [SCDP-PAPER] SCDP — Original Paper
단일 RGB와 공간 조건부 동작 생성의 원 논문.

- [SCDP-CODE] SCDP — Official Implementation
연구팀의 공개 구현. 연구 모델을 본인이 학습한 것으로 서술하지 않습니다.

CONTINUE READING

## Related Records

Collection

### 조작·시연

로봇 구성·역할 분담·접촉과 파지의 조작 경험, 아홉 가지 시연 목차를 정리합니다.
↗

Technical Report

### Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.
↗

Technical Report

### Dataset QA

선택한 episode의 저장·시각화·학습 입력을 대조하는 내부 Dataset QA Checklist를 개발했습니다.
↗

Technical Report

### 외부 모델 실행 연동 — SCDP

연구팀의 SCDP 모델을 MiMicX에서 실행: 16D rotvec adapter·입출력 계약·좌표 변환과 실로봇 확인.
↗

Technical Report

### ACT Temporal Ensembling

ACT 추론에서 겹치는 action chunk를 처리하는 Temporal Ensembling을 런타임에 연결했습니다.
↗

Technical Report

### Diffusion Policy 연동

Diffusion Policy를 기존 모델 선택·학습·checkpoint·실행 구조에 통합했습니다.
↗
