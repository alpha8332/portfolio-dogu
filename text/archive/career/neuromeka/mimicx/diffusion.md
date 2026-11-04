# Diffusion Policy 연동 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/mimicx/diffusion.html

TECHNICAL REPORT

# Diffusion Policy 연동

Diffusion Policy를 기존 모델 선택·학습·checkpoint·실행 구조에 통합했습니다.

Diffusion PolicyImitation LearningPython

MY ROLE
Model adapter · 학습 및 실행 계약 연결

DOCUMENT
Technical Report

Diffusion Policy를 MiMicX의 별도 model family로 통합했습니다. 관측을 조건으로 action chunk의 noise를 예측하는 학습과 반복 denoising을, 기존 데이터 로더·학습 job·체크포인트·실시간 명령 실행 경로에 연결했습니다.

State-only MVP에서 시작해 RGB conditioning, camera contract, 추론 history와 action queue로 확장했습니다. 원 논문의 원리와 공식 구현을 참고하되, 경량 network·scheduler·시간 정렬 등 실제 로컬 구현의 선택과 제약을 구분해 설명합니다.

## 1. 연동 목표와 시스템 구조

### 1.1 Goal: Add a Model Family, Preserve the Platform

기존 학습·배포 경로는 ACT 중심이었습니다. Diffusion을 dropdown에만 추가하면 config 생성, success detector, checkpoint loader와 action 선택이 계속 ACT의 전제를 따를 수 있었습니다. 목표는 모델 하나를 실행하는 데서 끝나는 것이 아니라, 사용자가 고른 입력과 출력으로 학습하고 그 모델을 동일한 의미로 다시 불러와 실행할 수 있게 만드는 것이었습니다.

먼저 camera 없는 low-dimensional observation과 action으로 학습 경로를 만들고, 이후 RGB variant를 추가했습니다. 직접 수행한 통합 범위는 model-runtime registry, training adapter, PyTorch policy·scheduler·vision 경로, batch 계약, UI·readiness, artifact 저장과 inference executor입니다. 조건부 action diffusion이라는 알고리즘의 제안은 원 논문 저자들의 작업입니다.[D1]

외부 연구팀의 학습 결과를 받아 rollout한 SCDP 작업과도 다릅니다. 여기서는 MiMicX 내부 TrainingJob이 policy를 생성하고 loss·optimizer·checkpoint를 다루는 native model family를 추가했습니다.

### 1.2 Integration Sequence and Responsibility Boundaries

개발 순서와 그 단계에서 닫은 경계
| 단계 | 개발 내용 | 다음 단계에 필요한 이유

| 1. model vocabulary | family / provider / recipe와 capability | UI 이름과 실제 model 생성을 연결

| 2. training adapter | 기존 ACT 구성·생성을 adapter 뒤로 분리 | 공통 job 전체를 복제하지 않고 새 family 추가

| 3. lowdim MVP | normalizer·noise predictor·scheduler·masked loss | 관측→학습→checkpoint의 최소 경로 확보

| 4. RGB 확장 | public recipe resolve·small CNN·visual condition | input에 맞는 실제 policy 생성

| 5. deploy 계약 | metadata·camera order·RGB history·executor queue | 학습 때의 입력·출력 의미를 runtime에서 재구성

| 6. UI·운영 정리 | family별 controls·labels·polling 선택 유지 | 표시와 payload가 실제 기능을 일관되게 반영

TrainingService에는 job 상태, 데이터 로더, optimizer, 저장과 resume의 공통 흐름을 남겼습니다. 모델별 config·policy 생성은 adapter/provider로, 추론의 action chunk 선택은 executor로 분리했습니다. Diffusion 때문에 같은 학습 loop와 저장 코드를 별도로 복사하면 수정 지점이 늘어나고 ACT와 동작이 갈라질 수 있기 때문입니다.

Training의 선택은 “어떤 model family를 학습할 것인가”이고, Deploy는 선택한 checkpoint를 기준으로 실행 설정을 복원합니다. ACT+TE는 ACT의 추론 옵션이며 Diffusion family와 같은 층위의 모델 선택지가 아닙니다. RTC 같은 chunk 실행 전략도 모델 family와 구분했습니다.

### 1.3 Architecture: Recipe, Adapter, Provider and Executor

[그림: Figure 1. UI의 의도에서 backend resolver·학습 adapter·provider로 이어지는 경로와, checkpoint를 복원해 live 입력·queue·명령을 실행하는 경로입니다. 화살표는 책임과 데이터 전달이며 별도 프로세스나 병렬 thread 수를 뜻하지 않습니다.]

Figure 1. UI의 의도에서 backend resolver·학습 adapter·provider로 이어지는 경로와, checkpoint를 복원해 live 입력·queue·명령을 실행하는 경로입니다. 화살표는 책임과 데이터 전달이며 별도 프로세스나 병렬 thread 수를 뜻하지 않습니다. 크게 보기 ↗

실제 사용하는 식별 정보
| 필드 | 값 / 역할

| model_family | diffusion — 알고리즘 family

| provider_id | diffusion_nrmk — config·policy·bundle 구현

| base_recipe_id | diffusion_unet — 사용자에게 보이는 선택

| resolved recipe_id | diffusion_unet_lowdim / diffusion_unet_rgb

| provider_config | horizon·steps·normalization·vision 등 모델 구성

사용자에게는 하나의 Diffusion U-Net 선택지를 보여주고, backend가 선택된 observation key를 보고 state-only 또는 RGB variant를 결정합니다. Depth key는 readiness와 provider 양쪽에서 거부합니다. UI가 입력 모양을 보고 별도의 variant 추정을 하지 않고, backend가 반환한 resolved recipe와 label을 표시하게 했습니다.

내부 recipe 이름은 저장·복원에 필요하지만 모두 사용자 dropdown에 노출할 필요는 없었습니다. 기존 lowdim checkpoint의 내부 ID는 계속 읽을 수 있게 하고, 새 artifact에는 public base recipe와 실제 resolved variant를 함께 남겼습니다.

## 2. Action Diffusion과 학습

### 2.1 Conditional Action Denoising

직접 회귀한 하나의 평균 action만으로는 여러 가능한 시범 동작을 표현하기 어려울 수 있습니다. Diffusion Policy는 관측을 조건으로 action sequence의 분포를 학습하고, 무작위 action에서 noise를 반복 제거해 하나의 sequence를 생성합니다. 여기서 diffusion의 대상은 이미지 pixel이 아니라 로봇 action입니다.[D1]

[그림: Figure 2. Chi et al. (2023) §II-B/C의 조건부 action diffusion을 참고해 로컬 계산 경로로 재구성했습니다. 학습에서는 정답에 넣은 noise를 맞히고, 추론에서는 정답 없이 반복 업데이트합니다. 실제 측정 궤적이나 논문 실험 결과를 그린 그림은 아닙니다.]

Figure 2. Chi et al. (2023) §II-B/C의 조건부 action diffusion을 참고해 로컬 계산 경로로 재구성했습니다. 학습에서는 정답에 넣은 noise를 맞히고, 추론에서는 정답 없이 반복 업데이트합니다. 실제 측정 궤적이나 논문 실험 결과를 그린 그림은 아닙니다. 크게 보기 ↗

학습 sample은 observation과 demonstrated action chunk를 함께 제공합니다. 임의의 noise level k를 뽑아 action에 Gaussian noise를 섞고, network가 그 noise를 예측하도록 학습합니다. 추론에서는 demonstration target을 주지 않고 live observation과 무작위 chunk로 시작합니다. 한 번의 sampling 안에서는 observation condition을 고정하고 action 쪽만 반복 갱신합니다.

### 2.2 Three Horizons and Two Different Clocks

비슷한 숫자지만 서로 다른 축
| 기호 / 설정 | 의미 | 로컬 기본값 예시

| T_o / n_obs_steps | 조건 입력의 관측 길이 | 2

| T_p / horizon | 한 번에 denoise하는 예측 action 길이 | 16

| T_a / n_action_steps | 한 번 예측한 뒤 queue로 실행할 길이 | 8

| K / num_train_timesteps | 학습에서 사용하는 noise level 수 | 100

| S / num_inference_steps | 한 chunk 생성 시 reverse update 횟수 | 16

[그림: Figure 3. 논문의 관측·예측·실행 horizon 개념과 로컬 queue를 구분했습니다. 예제의 T_o=2, T_p=6, T_a=3은 시간 관계를 보이기 위한 값입니다. Noise 반복 k와 환경의 실행 시점 t는 다른 축입니다.]

Figure 3. 논문의 관측·예측·실행 horizon 개념과 로컬 queue를 구분했습니다. 예제의 T_o=2, T_p=6, T_a=3은 시간 관계를 보이기 위한 값입니다. Noise 반복 k와 환경의 실행 시점 t는 다른 축입니다. 크게 보기 ↗

T_p개의 미래 action을 만들더라도 전부 실행하지 않고 T_a개만 commit한 뒤 다시 관측해 예측합니다. T_a가 작으면 새 관측을 더 빨리 반영하지만 sampling을 자주 수행합니다. S를 늘리는 것은 한 번의 noise 제거 계산을 늘리는 것이며 로봇 action을 더 많이 보내는 것과 다릅니다.[D1]

표의 숫자는 구현 기본값이지 실측 주기나 최적 설정이 아닙니다. Config는 T_a를 horizon 이하로 제한하고 inference step 수를 train timestep 수 이하로 제한합니다. 데이터 sample 간격, inference loop 주기와 로봇의 내부 servo 주기도 따로 해석해야 합니다.

### 2.3 Forward Noise and the Actual Reverse Update

Ak=ᾱkA0+1−ᾱkε정규화한 clean action A₀에 noise를 넣는 로컬 scheduler 식
A₀와 ε의 shape는 (B,T_p,D_a)입니다. B는 batch, D_a는 선택 action key들의 폭 합이며 ε는 표준 정규분포에서 뽑습니다. α_k=1−β_k, ᾱ_k는 0부터 k까지 α의 누적곱입니다. 보존 구현은 β를 10⁻⁴에서 2×10⁻²까지 선형 증가시킵니다. K개의 noise level 중 sample마다 하나를 뽑고, 그 k의 sinusoidal embedding도 network에 제공합니다.

Â0=Ak−1−ᾱkε̂θᾱk선택한 noise level k에서 clean action을 추정
Aj=ᾱjÂ0+1−ᾱjε̂θ이전 선택 level j로 이동하는 실제 reverse step
ε̂θ는 현재 A_k·k·관측 condition으로 예측한 noise입니다. 추론 schedule은 K−1에서 0까지 S개 index를 균등 선택해 반올림하며, 마지막 step의 j는 −1로 두고 ᾱ_j=1을 사용해 clean estimate로 끝냅니다. 분모에는 작은 값 하한을 둡니다.

클래스 이름은 DDPMScheduler이지만 reverse step에는 매번 새 Gaussian noise를 더하지 않습니다. DDPM식 noise 학습과, 선택한 step 사이를 결정적으로 이동하는 DDIM 형태의 복원식을 사용합니다. 시작 chunk는 무작위이므로 여러 sample을 만들 수 있지만, 원 논문의 확률적 reverse 식을 그대로 구현한 것으로 설명하지 않았습니다. 논문과 로컬 scheduler의 schedule·sampling 선택을 구분했습니다.[D1]

prediction_type이나 noise_scheduler_type이 config에 있어도 현재 forward와 sampling은 epsilon predictor와 위 scheduler를 사용합니다. 문자열 옵션이 저장된다는 사실만으로 sample-prediction·v-prediction이나 여러 sampler가 전환된다고 해석할 수는 없습니다.

### 2.4 Noise-Prediction Loss and Padding

L=∑b,t,dmbt(ε̂btd−εbtd)2Da·max(∑b,tmbt,1)유효 action 시점에 대한 masked noise MSE
m=1−is_pad이며 실제 action이 있는 timestep만 loss에 포함합니다. Episode 끝에서 길이가 모자라면 마지막 action을 반복해 tensor 크기를 맞추지만, 그 반복 영역을 새로운 정답으로 학습하지 않도록 mask로 제외합니다. 분모는 유효 timestep 수×action 폭이며, mask가 없으면 전체 원소 평균 MSE를 사용합니다.

학습에서는 noise를 더한 action에 대한 예측과 실제로 넣은 ε를 비교합니다. 로봇 위치 오차를 직접 최소화하는 L1 loss와는 다릅니다. 공통 TrainingJob과 지표 표시를 연결하기 위해 결과 dict에 l1_loss 이름도 남겨 두었지만 이 값은 같은 diffusion loss의 alias입니다. Noise MSE와 task 성공률, 실제 action 오차를 같은 지표로 읽지 않도록 구분했습니다.

RGB variant에서는 이 loss의 gradient가 visual encoder에도 전달됩니다. 이미지 feature를 별도로 고정해 놓은 뒤 action 모델만 학습하는 경로가 아니라, 선택한 encoder와 noise predictor를 함께 update할 수 있는 경로입니다.

## 3. 데이터·시간·표현 방식

### 3.1 Batch Assembly: Camera, Time and Action Blocks

tensor 계약과 실제 사용하는 축
| 대상 | shape | 연결 규칙

| camera 하나의 RGB sequence | (B,T_o,3,H,W) | 채널 위치를 정리하고 시간 길이를 맞춤

| multi-camera batch helper | (B,T_o,N,3,H,W) | camera 순서로 dim=2 stack

| lowdim companion sequence | (B,T_o,D_low) | key 순서대로 마지막 feature축 concat

| noise 대상 action | (B,T_p,D_a) | ordered action key를 concat하고 slice 보존

| global condition | (B,T_o(D_low+NF)) | 카메라당 F feature와 상태를 time별 결합 후 flatten

| is_pad | (B,T_p) | action 시간축과 일치

RGB·lowdim preparation helper를 만들어 camera order, 시간축, action key별 slice와 padding을 독립적으로 검사할 수 있게 했습니다. Action helper는 길이 보충으로 생긴 mask와 기존 is_pad를 OR로 합칩니다. Key별 slice가 있어야 합친 벡터를 다시 같은 의미의 action으로 나눌 수 있습니다.

실제 표준 TrainingService는 loader의 batch를 policy에 직접 전달합니다. Policy도 key별 RGB·state·action coercion을 수행합니다. 따라서 helper의 stacked tensor 계약과 실제 policy 호출에서 쓰는 key별 tensor 경로는 구분했습니다. Helper를 시험했다는 사실만으로 모든 loader가 과거 관측 sequence를 공급한다고 판단하지 않았습니다.

### 3.2 History Shapes vs Actual Observation History

[그림: Figure 4. 표준 loader의 단일시점 관측, policy의 반복 보충, live RGB의 rolling history를 구분했습니다. 동일한 shape를 만든다고 독립적으로 수집한 과거 관측이 생기는 것은 아닙니다.]

Figure 4. 표준 loader의 단일시점 관측, policy의 반복 보충, live RGB의 rolling history를 구분했습니다. 동일한 shape를 만든다고 독립적으로 수집한 과거 관측이 생기는 것은 아닙니다. 크게 보기 ↗

표준 imitation dataset은 sample t의 관측 하나와 t부터 시작하는 action chunk를 읽습니다. RGB policy는 이미 sequence인 입력도 받을 수 있지만, 단일 프레임이면 마지막 프레임을 반복해 T_o를 채웁니다. Lowdim-only policy도 현재 state를 flatten한 뒤 n_obs_steps만큼 반복합니다. 이 반복은 실제 과거 센서 값을 복원하는 과정이 아닙니다.

반면 live RGB preprocessor는 첫 유효 frame을 복사해 history를 초기화하고, 이후 호출부터 새 frame을 추가해 마지막 T_o개를 유지합니다. Companion lowdim도 RGB 경로에서 같은 순서로 stack합니다. 초기화는 T_o개의 새 frame을 기다리는 warmup이 아니라 첫 frame 반복입니다.

따라서 standard loader의 단일 관측 반복과 runtime의 실제 rolling history가 만드는 시간적 조건은 별도로 대조해야 합니다. 진짜 과거 관측을 학습에 쓰려면 loader의 sample window, action 정렬, boundary fill까지 함께 설계해야 합니다. 이번 통합의 shape·queue 검사와 이 시간 의미의 실험 검증을 같은 완료 항목으로 묶지 않았습니다.

### 3.3 Per-Key Normalization and Physical Units

anorm=a−cs,c=amax+amin2,s=amax−amin2min-max 모드의 정규화와 복원
Canonical action의 위치·관절·force 등은 단위와 범위가 다릅니다. Noise를 같은 scale에서 넣고 예측하기 위해 key별 mean/std 또는 min/max 통계를 사용하고, sampling 뒤 같은 key 순서로 역정규화합니다. min-max의 역변환은 a=s·a_norm+c입니다. Scale과 std에는 10⁻⁶ 하한을 두며, 명시한 통계가 없으면 현재 normalizer는 원값을 반환합니다.

그래서 checkpoint에는 정규화 모드뿐 아니라 실제 stats가 필요합니다. 동일한 weight라도 다른 통계나 key 순서로 복원하면 로봇에 전달되는 값이 달라집니다. 정규화된 model tensor와 물리 단위를 가진 최종 명령을 분리하고, 하드웨어별 단위 해석은 기존 canonical·command 계약을 유지했습니다.

### 3.4 Rotation Representation and Safe Slice Restoration

Converted dataset은 task orientation을 3×3 행렬의 9개 값으로 제공할 수 있습니다. Diffusion action tensor에는 행렬의 첫 두 열을 이어 붙인 ortho-6D를 사용했습니다. 따라서 checkpoint의 해당 action shape는 [6]이고, 실제 command를 만들 때 다시 9개 행렬 원소로 복원합니다.

Executor는 action_key_order를 따라 저장된 raw width만큼 먼저 자르고 offset을 증가시킵니다. 그 뒤 orientation block만 두 3-vector의 정규화·외적으로 회전행렬로 바꿉니다. 예를 들어 위치 3, 회전 6, gripper 1이면 model 벡터의 gripper는 offset 9에서 읽어야 합니다. 회전을 9개로 복원했다는 이유로 offset을 12로 옮기면 뒤 채널이 유실됩니다.

이 규칙으로 task pose 뒤의 hand·gripper·scalar를 회전 표현과 분리했습니다. 벡터 폭은 선택한 output에 따라 달라지며, 특정 로봇의 물리 DOF와 같아야 하는 값이 아닙니다. 회전행렬→6D 변환, forward noise loss, split 뒤 행렬 복원의 각 경계를 따로 검사했습니다.

## 4. 네트워크와 시각 조건

### 4.1 The Implemented Conditional Temporal Network

[그림: Figure 5. 로컬 ConditionalUnet1D의 실제 레이어를 따라 그렸습니다. Horizon을 유지하는 두 residual block과 additive condition을 사용하며, 이름만 보고 다중 해상도 U-Net을 그리지 않았습니다.]

Figure 5. 로컬 ConditionalUnet1D의 실제 레이어를 따라 그렸습니다. Horizon을 유지하는 두 residual block과 additive condition을 사용하며, 이름만 보고 다중 해상도 U-Net을 그리지 않았습니다. 크게 보기 ↗

Noisy action (B,T_p,D_a)을 Conv1d가 사용하는 (B,D_a,T_p)로 바꾸고 hidden channel C로 projection합니다. 두 conditional residual block 뒤 Mish와 출력 Conv1d를 거쳐 다시 (B,T_p,D_a)의 predicted noise를 만듭니다. 각 convolution은 kernel 3, padding 1로 시간 길이를 유지합니다.

hl+1=hl+Fl(hl)+gl(c,k)로컬 residual block의 조건 주입
F는 Conv1d→GroupNorm(1 group)→Mish→Conv1d이며, g는 관측 condition과 sinusoidal time embedding을 이어 붙여 Mish·Linear로 C개 값에 projection한 것입니다. 이 condition을 모든 시간 위치에 broadcast해 더합니다. Action sample을 처리하는 경로와 관측·noise level 조건을 넣는 경로를 분리했습니다.

원 논문의 temporal CNN과 공식 ConditionalUnet1D는 down/up sampling과 다중 해상도 skip 구조, 조건부 modulation을 사용합니다. 현재 로컬 class는 두 block의 경량 조건부 temporal CNN입니다. 알고리즘의 학습·sampling 계약을 기존 플랫폼에 연결한 구현으로 설명하며, 공식 network의 모든 구조나 표현력을 재현했다고 서술하지 않았습니다.[D3]

### 4.2 Shared Small CNN and Global Conditioning

[그림: Figure 6. 각 camera history를 같은 small CNN으로 처리한 뒤, camera·time 순서를 보존해 lowdim과 결합합니다. 입력 모양과 feature 차원은 실제 encoder와 config의 계산을 따릅니다.]

Figure 6. 각 camera history를 같은 small CNN으로 처리한 뒤, camera·time 순서를 보존해 lowdim과 결합합니다. 입력 모양과 feature 차원은 실제 encoder와 config의 계산을 따릅니다. 크게 보기 ↗

RGB를 넣기 위해 새로운 외부 vision 의존성을 추가하는 대신 PyTorch-only small_cnn을 만들었습니다. Conv2d 3→32(kernel 5,stride 2), 32→64와 64→128(kernel 3,stride 2) 뒤에 ReLU를 두고, adaptive average pool→Linear(128,F)→LayerNorm으로 frame당 F개의 feature를 만듭니다. Camera마다 다른 encoder를 생성하지 않고 같은 instance를 재사용합니다.

Dcond=To(Dlow+NF)RGB와 선택 state를 합친 global condition 폭
N은 선택 camera 수, D_low는 state feature 합입니다. 각 camera의 B×T_o frame을 encoder에 넣고 (B,T_o,F)로 복원한 뒤 camera feature를 이어 붙입니다. 여기에 정규화한 lowdim을 timestep별로 합치고 history를 flatten합니다. Camera 순서가 바뀌면 같은 shape라도 condition의 의미가 달라집니다.

전처리는 uint8 또는 0–255 입력을 [0,1] float로 바꾸고 필요 시 crop·resize를 적용합니다. Config의 image_size는 [W,H]이고 tensor는 [H,W]이므로 resize 호출에서는 순서를 맞춥니다. 모듈의 optional mean/std·hook 기능과 실제 provider/UI에서 연결한 기본 crop·size 경로도 구분했습니다.

### 4.3 Paper, Official Code and Local Choices

서로 다른 층위의 구현을 구분
| 항목 | 논문 / 공식 구현 참고 | MiMicX 보존 구현

| 생성 대상 | 관측 조건부 action sequence | 선택 action key를 concat한 chunk

| Noise predictor | 공식 temporal U-Net / Transformer 계열 | 동일 해상도 conditional residual block 2개

| Vision | 논문 ResNet-18·spatial softmax·camera별 encoder | 공유 small CNN·average pool·Linear·LayerNorm

| Noise schedule | 논문 cosine와 inference 가속 논의 | linear beta·선택 timestep의 결정적 reverse 식

| 실행 구간 | 공식 image policy: T_o−1부터 T_a개 | 로컬 target index 0부터 T_a개

| 확인 범위 | 논문의 task benchmark | 통합 경로·synthetic training·contract·mock 실행 검사

참고한 공식 repository 자체도 encoder 공유나 scheduler 등 여러 설정을 지원합니다. 논문에서 사용한 한 실험 설정, 공식 코드의 가능한 선택, 이번 로컬 구현을 서로 같은 것으로 고정하지 않았습니다. 원 논문과 저자 코드는 알고리즘 원리와 비교 기준이며, 실제 model·tensor·artifact 동작은 사용한 구현을 따라 설명합니다.[D1][D2][D4]

## 5. Checkpoint와 실로봇 실행

### 5.1 Checkpoint as an Execution Specification

[그림: Figure 7. 선택한 모델을 다시 만들려면 weight뿐 아니라 resolved recipe·vision·정규화·입출력 계약이 필요합니다. UI의 현재 상태를 다시 추측해 checkpoint를 해석하지 않도록 저장·복원 경계를 연결했습니다.]

Figure 7. 선택한 모델을 다시 만들려면 weight뿐 아니라 resolved recipe·vision·정규화·입출력 계약이 필요합니다. UI의 현재 상태를 다시 추측해 checkpoint를 해석하지 않도록 저장·복원 경계를 연결했습니다. 크게 보기 ↗

policy_last.ckpt, metadata.json, run_manifest.json, resume_state.json과 nested model_contract에 family/provider, base recipe, resolved recipe·variant, provider_config, key 순서·expected shapes, camera_names와 lineage를 이어갔습니다. RGB에는 encoder ID·feature dimension·image size·camera order 등의 vision_contract도 보존했습니다.

Loader는 checkpoint config와 호환 metadata에서 누락 필드를 정리하고 variant에 맞는 policy를 생성합니다. Stats를 복원하고 state_dict를 strict하게 불러온 뒤, bundle에 action key order·output shape·camera contract를 구성합니다. RGB key가 없는 RGB 모델이나 image가 들어간 lowdim 모델, depth 입력은 이 단계에서도 거부합니다.

이전 lowdim checkpoint는 구형 metadata fallback으로 읽을 수 있게 유지했습니다. Rollback도 이름만 ACT로 바꾸는 것이 아니라 ACT checkpoint를 선택하거나 model-family slice를 일관되게 되돌리는 방식입니다. UI만 되돌리면 저장된 모델의 종류와 runtime이 서로 달라질 수 있습니다.

### 5.2 Denoising, Action Queue and Target-Time Alignment

Diffusion executor는 queue가 비어 있을 때 predict_action_sequence를 호출합니다. Policy는 horizon 전체를 denoise하고 역정규화한 첫 T_a개를 반환합니다. Executor는 최대 n_action_steps만 queue에 넣고 호출마다 한 action을 꺼냅니다. Queue가 남아 있는 동안에는 full sampling을 다시 하지 않습니다.

Queue를 refill한 뒤 각 action은 기존 split→command builder→backend actuator 경로로 갑니다. Success probability head는 없고 Temporal Ensemble은 ACT 전용으로 비활성화합니다. TE의 중첩 chunk 결합과 DP의 반복 denoising은 같은 smoothing 기능이 아닙니다.

공식 DiffusionUnetImagePolicy는 전체 action_pred와 실제 실행 action을 구분하고 T_o−1부터 T_a개를 선택합니다. 로컬 표준 loader는 관측 sample t와 t부터 시작하는 action target을 묶으므로 local policy는 앞 T_a개를 사용합니다. Slice 숫자만 복사하면 실행할 시점이 달라질 수 있어 dataset의 target 정렬부터 비교했습니다.[D2]

한 chunk를 만드는 동안 관측 condition은 고정돼 있고, queue 실행 중 새 입력이 준비돼도 이미 만든 chunk가 즉시 다시 계산되지는 않습니다. 새 관측은 다음 queue refill에서 예측에 반영됩니다. Step별 명령 전송과 observation 기반 재계획을 같은 빈도로 설명하지 않았습니다.

### 5.3 Live RGB History and Camera Compatibility

초기 runtime은 RGB를 단일 frame으로 만들었기 때문에 checkpoint의 camera_names와 n_obs_steps 구성을 재현하지 못했습니다. RGB variant에서만 전용 history preprocessor를 켜고, camera마다 필요한 frame이 있는지와 live 순서가 checkpoint와 맞는지 먼저 검사하도록 연결했습니다.

Frame을 channel-first로 정리하고 image_size·crop 규칙을 적용한 뒤, 첫 frame 반복 초기화와 이후 rolling update를 수행합니다. Companion state도 같은 길이로 stack하고 history reset 시 RGB·state buffer를 함께 비웁니다. 누락 camera와 order mismatch는 action을 생성하기 전에 드러납니다.

이 검사는 frame의 존재·순서·tensor 구성을 확인합니다. Camera 간 물리적 동시 촬영이나 지연 상한을 측정하는 검사는 아닙니다. 앞서 설명한 학습 history와의 시간 의미 대조도 별도 필요하므로, shape 검증을 시간 동기화 성능으로 확대하지 않았습니다.

### 5.4 Sampling Cost and Execution Commitment

Tcommit=Ta·Δt일정한 실행 간격 Δt를 가정한 chunk commit 시간
예를 들어 Δt=50ms, T_a=8이면 한 chunk에서 commit한 명령 구간은 계산상 400ms입니다. 이것은 실제 로봇에서 측정한 지연이 아니라 설정의 시간 의미를 보여 주는 예입니다. T_a를 늘리면 sampling 호출 수를 줄일 수 있지만 새 관측을 반영하는 계획 갱신 간격도 길어집니다.

S번의 network 호출, visual encoding, tensor 이동과 명령 전송이 runtime 예산을 사용합니다. 현재 경로는 동기적으로 sampling하므로 평균 계산 시간만으로 모든 실행 deadline을 만족한다고 할 수 없습니다. 추후 비교에서는 sampling 시간 분포, queue refill 시점, 실제 관측 age와 task 반응을 함께 측정해야 합니다.

## 6. 문제해결과 설계 판단

### 6.1 Integration Failures and the Fix Sequence

[그림: Figure 8. 동일한 “Diffusion 선택이 이상함”도 dropdown 상태, job label, model capability, RGB launch와 live 입력에서 원인이 달랐습니다. 수정한 경계를 나누어 정리했습니다.]

Figure 8. 동일한 “Diffusion 선택이 이상함”도 dropdown 상태, job label, model capability, RGB launch와 live 입력에서 원인이 달랐습니다. 수정한 경계를 나누어 정리했습니다. 크게 보기 ↗

초기 UI는 model_id 중심이라 family/provider/recipe를 명시하지 않으면 ACT 기본값으로 해석될 여지가 있었습니다. Training payload와 preset에 canonical runtime fields를 넣었습니다. 이후 polling이 dropdown을 다시 만들면서 선택을 ACT로 되돌리는 문제는 재렌더링 전 선택값을 저장하고 복원하도록 수정했습니다.

Run Monitor에 Booting ACT training이 표시된 문제는 backend job message의 하드코딩이었습니다. Label만 보고 실제 policy도 ACT라고 단정하지 않고 resolved metadata와 생성 경로를 확인한 뒤 family별 표시명을 사용했습니다. 동시에 ACT 전용 aux label·success detector를 공통 label 선택 로직이 다시 켜는 경로도 막았습니다.

RGB 확장에서는 UI에 variant가 생기는 것과 학습 launch가 그 policy까지 도달하는 것이 달랐습니다. Adapter의 lowdim-only image gate를 정리하고, resolved internal recipe를 provider로 전달했습니다. image_size처럼 service가 명시적으로 주는 값과 provider_config가 겹치지 않게 공통 인자를 제거한 뒤 확장 설정을 전달했습니다.

RGB checkpoint를 만들 수 있어도 live 입력은 여전히 단일 frame일 수 있었습니다. 그래서 history preprocessor, camera guard, RGB policy loader와 executor queue를 각각 연결했습니다. 초기에 학습만 지원하던 상태를 최종 deploy 기능의 상태로 그대로 남기지 않고 개발 단계별 경계를 갱신했습니다.

### 6.2 Verification: Policy, Training Job, Bundle and Runtime

각 검사가 확인한 범위
| 검사 | 확인 결과의 의미

| State-only / RGB policy | 유한 noise loss, backward·gradient·optimizer update

| Multi-camera / batch helper | feature·camera 순서·action concat/split·padding 계약

| Synthetic TrainingJob epoch | 공통 job→provider→policy→metric→checkpoint 경로

| Checkpoint / legacy load | recipe·variant·vision·IO·stats 복원과 구형 lowdim 호환

| Mock inference queue | queue refill 횟수와 1-step drain·split·worker 연결

| UI/API | public recipe, readiness RGB/lowdim label, depth blocker, TE off

정책 단위 검사를 통과한 뒤 synthetic dataset으로 공통 TrainingJob의 한 epoch를 실행하고, checkpoint가 생성되며 RGB variant·camera·vision contract가 남는지 확인하는 검사를 연결했습니다. 이는 실제 수집 데이터의 장기 학습이나 로봇 task 성능 검사와는 다른 단계입니다.

확인한 개발 기록과 보존 검사에서는 policy·training job·checkpoint·mock runtime과 UI/API 연결을 검증했습니다. 실제 RGB 학습의 완료 산출물과 실로봇 지연·task 결과는 별도 실험 기록으로 남겨야 합니다. 논문의 성공률이나 ACT 대비 향상을 이번 통합 성과로 가져오지 않았습니다.

현재 후속 검토의 핵심은 standard loader와 live RGB의 history 의미를 맞추고, 그 조건을 고정한 실제 데이터 학습·rollout을 비교하는 것입니다. 미작성 실험 결과와 영상별 평가는 사용자가 작성할 항목으로 남겼습니다.

### 6.3 Engineering Note

새 알고리즘을 넣는 일은 model class를 하나 더 만드는 일보다 넓었습니다. Shared label resolver가 success detector를 다시 켜거나 polling이 모델 선택을 바꾸는 문제는 network 밖에 있었습니다. 모델을 지원한다는 선언은 UI의 의도부터 저장·실행까지 같은 선택을 보존할 때 비로소 의미가 있다는 걸 배웠습니다.

또한 shape가 맞는 것과 같은 정보를 주는 것은 달랐습니다. 같은 이미지를 두 번 넣은 tensor와 서로 다른 두 시점의 관측은 모양이 같아도 학습 조건이 다릅니다. 시간축을 다룰 때는 길이보다 sample이 어느 시점을 가리키는지 먼저 정의해야 한다는 점을 이해했습니다.

마지막으로 U-Net·DDPM이라는 이름만으로 구조와 계산을 설명하지 않게 됐습니다. 실제 layer, noise schedule, reverse 식과 action slice를 따라가야 모델의 동작과 한계를 정확히 말할 수 있었습니다. 구현을 연결한 성과와 알고리즘을 충분히 검증한 성과를 구분하고, 다음 실험이 확인해야 할 조건도 더 구체적으로 정할 수 있게 됐습니다.

## References

- [D1] Chi et al. — Diffusion Policy: Visuomotor Policy Learning via Action Diffusion (RSS 2023)
§II-B/C: action denoising와 horizon. §III-A–D: network·vision·schedule·inference 가속. 논문 benchmark는 개인 실험 결과가 아닙니다.

- [D2] Official DiffusionUnetImagePolicy
conditional_sample / predict_action / compute_loss. 공식 action_pred와 실행 구간을 로컬 정렬과 구분해 참조했습니다.

- [D3] Official ConditionalUnet1D
다중 해상도 U-Net·conditional residual block·FiLM 비교. 로컬 경량 network와 동일 구현으로 제시하지 않습니다.

- [D4] Official MultiImageObsEncoder
camera별/shared encoder와 전처리의 공식 구현 참고.

CONTINUE READING

## Related Records

Technical Report

### ACT Temporal Ensembling

ACT 추론에서 겹치는 action chunk를 처리하는 Temporal Ensembling을 런타임에 연결했습니다.
↗

Technical Report

### Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.
↗

Technical Report

### 독립 다중 로봇 지원

독립된 Indy12 두 대의 session·소유권·raw schema를 설계하고 수집·학습·추론·시각화·Replay까지 연결했습니다.
↗

Technical Report

### 외부 모델 실행 연동 — SCDP

연구팀의 SCDP 모델을 MiMicX에서 실행: 16D rotvec adapter·입출력 계약·좌표 변환과 실로봇 확인.
↗
