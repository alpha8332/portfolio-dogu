# KAIST / SCDP · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/experiments/scdp/index.html

RESEARCH SUPPORT

# KAIST / SCDP

연구용 demonstration 수집과 카메라·관절 정보 전달, 별도 학습 모델 rollout 연동.

Imitation LearningSCDPKAISTData CollectionBin PickingBoard WipingCup Dispensing

MY ROLE
연구용 Teleoperation 데이터 수집 · 로봇·카메라 정보 전달 · 별도 rollout 연동

DOCUMENT
Technical Report

Bin Picking·칠판 닦기·컵 분리 동작의 demonstration 수집과 로봇·카메라 정보를 전달한 연구 협업 기록입니다. 모델 학습은 연구팀이 담당했습니다.

## 1. 수집 역할과 모델 맥락

### 1.1 Demonstration 수집과 연구팀 학습의 경계

KAIST SCDP 연구를 지원하며 Bin Picking, 칠판 닦기, 컵을 뽑아 놓는 동작의 텔레오퍼레이션 데이터를 수집했습니다. 제가 만든 것은 사람이 조작한 demonstration이며, 모델의 설계·학습과 논문 평가는 연구팀이 수행했습니다.

연구팀이 학습한 결과물을 받아 MiMicX의 실제 로봇에서 실행하도록 연결하는 업무도 수행했습니다. 데이터 수집, 로봇·카메라 정보 전달, 모델 실행 adapter는 협업의 서로 다른 연결점입니다.

[그림: 연구 협업의 역할과 데이터·좌표 해석 흐름을 직접 작성했습니다. 논문 모델의 학습 경로는 연구팀 소유로 표시하고, demonstration·장치 정보 전달과 별도 rollout 연동을 구분했습니다.]

연구 협업의 역할과 데이터·좌표 해석 흐름을 직접 작성했습니다. 논문 모델의 학습 경로는 연구팀 소유로 표시하고, demonstration·장치 정보 전달과 별도 rollout 연동을 구분했습니다. 크게 보기 ↗

### 1.2 세 수집 작업에서 다른 관찰 대상

수집 task와 이해해야 할 접촉 단계
| 작업 | 동작의 의미 | 기록을 해석할 때 볼 점

| Bin Picking | 물체에 접근해 파지하고 집어 옮김 | 대상 선택·가림·파지 후 물체 상태

| Board Wiping | 도구를 칠판 면에 접촉시켜 닦음 | 접근과 접촉 유지, 닦는 구간

| Cup Dispensing & Placement | 겹친 컵에서 한 개를 분리해 놓음 | 파지·분리·운반·놓기의 전환

같은 팔 이동이라도 bin의 물체를 집는 동작과 칠판 면을 따라 움직이는 동작은 접촉 조건이 다릅니다. 수집한 동작이 어떤 task의 어느 단계인지를 설명해야 연구팀이 영상과 행동을 함께 해석할 수 있었습니다. 작업별 횟수·최종 영상 평가와 논문 전체 실험을 이 세 수집 작업의 결과로 합치지는 않습니다.

### 1.3 단일 영상에서 로봇 궤적을 시각 정보와 연결하는 모델

SCDP는 단일 RGB 영상에서 다중 스케일 특징을 만들고, 복원한 말단 궤적을 영상에 투영해 해당 위치의 특징을 추출하여 diffusion 동작 생성에 조건으로 사용하는 모델입니다. 이 구조에서는 로봇 좌표와 카메라 좌표가 어떤 관계인지 이해하는 것이 중요합니다.[SCDP]

논문의 공개 페이지에는 휴머노이드의 종이컵 분리와 칠판 닦기 시연도 소개돼 있습니다. 공개 모델의 원리를 이해하는 자료로 연결하며, 논문의 모든 자율 실행 결과나 성공률을 제가 수집한 demonstration의 개인 성적으로 옮기지 않습니다.[SCDP]

## 2. 좌표·관측 정보 전달

### 2.1 머리가 움직이는 카메라의 좌표 관계 전달

PSF UI에서 EIR의 카메라 extrinsic·intrinsic과 초기 관절 자세를 확인·추출해 연구자에게 전달했습니다. 머리에 카메라가 달려 있어 head-to-camera 변환만으로는 모든 로봇 자세의 base-to-camera 관계를 고정할 수 없었습니다. 머리의 현재 자세를 포함한 변환 합성이 필요했습니다.

TB←C=TB←HTH←C좌표를 옮기는 방향을 명시한 변환 합성
여기서 T[A←B]는 B 좌표의 점을 A 좌표로 옮기는 4×4 동차변환으로 정의합니다. B는 로봇 base, H는 head, C는 camera입니다. 카메라가 head에 고정돼도 head가 움직이면 T[B←H]가 달라집니다. 반대 방향으로 점을 옮길 때는 대응하는 역변환을 사용해야 합니다.

intrinsic은 해상도별로 구분해 전달했습니다. crop·resize가 추가되면 원래 픽셀 좌표와 모델 입력 좌표가 달라지므로, 카메라 행렬 숫자만 전달하기보다 어느 해상도와 전처리를 기준으로 했는지 함께 맞춰야 합니다. 제가 수행한 것은 기존 시스템의 정보를 추출·해석해 전달한 일이며 새 calibration 알고리즘 개발은 아닙니다.

### 2.2 초기 관절 배열에 의미를 붙이는 인수인계

초기 자세는 숫자 배열만 보내지 않고 torso 회전·기울기, head 기울기·회전, 왼팔 J1–J7, 오른팔 J1–J7, 뒤쪽 미사용 채널을 구분해 전달했습니다. 배열 길이가 맞더라도 관절 순서가 다르면 연구 코드가 같은 로봇 상태로 읽을 수 없기 때문입니다.

이 정보는 수집 당시의 자세를 해석하고 rollout 시작 조건을 맞추는 데 연결됩니다. 카메라 변환의 좌표 방향, 관절 배열 순서, 각도·위치 단위는 값과 함께 전달해야 하는 데이터의 의미였습니다.

## 3. 실행 연동과 Engineering Note

### 3.1 학습 결과물을 로봇 명령으로 연결한 별도 업무

전달받은 모델은 MiMicX의 기본 출력 표현과 달라 실행 adapter에서 맞추어야 했습니다. 카메라·관절 관측을 모델 입력으로 전달하고, 모델의 위치 변화·회전벡터 출력을 실제 로봇이 받는 절대 pose와 그리퍼 명령으로 바꾸는 경계를 다뤘습니다.

이 실행 연동을 연구 모델을 직접 학습한 경험과 합치지 않았습니다. 데이터 수집은 학습 전 입력을 만드는 일이고, rollout adapter는 학습 후 출력의 의미를 장비와 맞추는 일이었습니다.

External Model Rollout — 출력 계약과 로봇 실행 연동 →

### 3.2 Engineering Note

연구 협업에서는 파일이 전달됐다는 사실만으로 상대가 같은 정보를 읽는 것은 아니었습니다. 카메라가 어느 좌표계에 고정됐는지, 관절 배열의 각 숫자가 무엇인지 설명해야 했습니다. 데이터의 의미를 전달하는 일도 demonstration 수집의 품질을 결정한다는 점을 배웠습니다.

특히 head-to-camera는 고정돼도 base-to-camera는 로봇 자세에 따라 달라진다는 점을 전달하며, 센서 정보를 정적인 설정값으로만 보면 실행 해석이 달라질 수 있음을 이해했습니다. 수집·학습·실행을 맡은 사람이 달라도 이 관계와 단위·순서를 공유해야 협업이 이어집니다.

## References

- [SCDP] Spatially Conditioned Diffusion Policy — Official Project
지원 연구의 모델 원리. 논문의 학습·평가 결과는 연구팀의 결과입니다.

- [SCDP-PAPER] SCDP — Original Paper
단일 RGB와 공간 조건부 동작 생성의 원 논문.

- [SCDP-CODE] SCDP — Official Implementation
연구팀의 공개 구현. 연구 모델을 본인이 학습한 것으로 서술하지 않습니다.

CONTINUE READING

## Related Records

Work Area

### 모방학습 실험

개인 실험·Samsung SDI·SCDP의 수집 조건과 학습·실행 관찰을 탐색합니다.
↗

Technical Report

### 외부 모델 실행 연동 — SCDP

연구팀의 SCDP 모델을 MiMicX에서 실행: 16D rotvec adapter·입출력 계약·좌표 변환과 실로봇 확인.
↗

Collection

### 조작·시연

로봇 구성·역할 분담·접촉과 파지의 조작 경험, 아홉 가지 시연 목차를 정리합니다.
↗

Technical Report

### Dataset QA

선택한 episode의 저장·시각화·학습 입력을 대조하는 내부 Dataset QA Checklist를 개발했습니다.
↗
