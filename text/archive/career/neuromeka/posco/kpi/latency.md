# Master–Slave 제어 지연 평가 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/posco/kpi/latency.html

TECHNICAL REPORT

# Master–Slave 제어 지연 평가

Actual follower의 watcher·relay·preview, 위상 기반 지연 계산과 20회 반복 결과.

KPIDual NURITCPLatency

MY ROLE
측정 코드 구현 · 반복 시험 · 결과 분석

DOCUMENT
Technical Report

Master의 실제 TCP를 감시해 Slave 목표를 만드는 actual-based follower를 구성하고, 원 위상 통과 시각으로 제어 지연을 측정했습니다. Preview와 시간 정렬, tracking·잔차의 의미를 구분해 20회 시험 결과를 해석합니다.

## 1. 평가 정의와 실행 구조

### 1.1 평가 질문과 Actual Follower

Left를 Master, Right를 Slave로 두고 Master가 실제로 움직인 뒤 Slave가 따라가는 응답을 평가했습니다. 양팔에 같은 계획 궤적을 나눠 보내면 통신·호출 시차를 볼 수 있지만, Master actual을 관측해 전달하는 경로의 지연은 포함되지 않습니다. 그래서 Slave 입력을 계획 경로가 아닌 Master actual event에서 만들었습니다.

과제 번호는 KPI-3/PER-2-20이며 개발 문서에서는 KPI2입니다. 제 역할은 측정 코드 구현과 반복 시험·분석이었고, 측정 정의와 제어 구조 변경은 그룹장과 협의했습니다.

실제 지연 측정의 시작점은 조작기 버튼 입력이나 Left command send가 아니라 Left actual의 대응 위상입니다. 따라서 이 수치는 Master actual 관측·relay·Slave 응답 구간을 평가합니다. VR 센서나 Host runtime 입력까지 포함한 전체 조작기 E2E 지연과 측정 경계를 구분했습니다.

### 1.2 시험 조건과 실제 적용 설정

최종 기술설명서·실행 설정 기준
| 항목 | 설정 | 해석

| 로봇·인터페이스 | NURI 5S 양팔 / IndyDCP3 / TCP-IP | 동일 제어기의 양팔 상태를 읽고 팔 인덱스로 명령 전달

| 운동 | XZ 평면, r=100 mm, T=5 s, 시계 방향 | 회전 목표는 0, 위치 상대 목표를 갱신

| 반복 | 5 laps × 20 trials | 한 trial 25초, trial마다 시작 위치로 복귀

| 명령·로깅 | 60 Hz / 100 Hz 설정 | 약 16.7 ms / 10 ms 목표 간격. 실측 주기 보장과 구별

| 신호 단위 | 위치 mm / 자세 degree / 로그 시간 second | 지연 표시는 millisecond로 변환

Follower runtime 설정
| 항목 | 설정 | 의미

| Actual watcher / relay | 각 1000 Hz 요청 | Python polling 설정, 실측 servo rate가 아님

| Detect / match tolerance | 0.10 mm / 1.5 mm | 움직임 event 생성 / 최근 command 연관 추정

| 속도 필터 | 이전 값0.82 + 새 값0.18 | preview에 쓰는 미분 노이즈 완화

| Preview | 기본90 ms, gain0.90, velocity mode | 초기 horizon과 원호 진행량 배율

| Adaptive | 최근31개, 최소6개,20–250 ms clip | 감지된 command–actual 지연의 median

| Cap | base10 mm, auto scale1.25 | 실제 cap은 nominal speed·horizon에 따라 커질 수 있음

### 1.3 동시 실행 구조와 신호의 소유

[그림: 직접 작성한 실제 main 실행 경로. 계획 경로는 Left만 받고, Right는 watcher가 게시한 최신 actual event에서 목표를 만듭니다.]

직접 작성한 실제 main 실행 경로. 계획 경로는 Left만 받고, Right는 watcher가 게시한 최신 actual event에서 목표를 만듭니다. 크게 보기 ↗

Main은 Left command와 history를 만들고, watcher는 실제 상태를 읽어 latest event를 갱신하며, relay는 그 event를 읽어 Right 명령을 전송합니다. Logger는 이들과 독립적으로 실제 양팔·pdes·Right reference를 기록합니다. 공유 상태는 lock으로 복사해 사용합니다.

코드에 양팔을 같은 계획 경로로 구동하는 보조 함수가 있어도 본 시험의 main에서 호출하는 경로는 actual follower입니다. 함수가 존재한다는 사실만으로 시험 구조를 설명하지 않았습니다.

### 1.4 Master의 누적 상대 원궤적

θk=−2πTtk,uk=[r(cos(θk)−1)0rsin(θk)]T시작점 기준 누적 상대 원궤적 — mm
u0=0,pstart=pcenter+[r00]T,p(t)=pstart+u(t)상대 목표가 0에서 시작해 절대 원을 그리는 이유
Master의 r=100 mm·T=5 s 원궤적은 시작 시점 상대 목표가 0이 되도록 x에 −r을 넣습니다. 5 laps 동안 60 Hz 설정으로 목표를 갱신하고, Right는 이 배열을 직접 소비하지 않습니다. 같은 원형 운동이라도 Right 입력이 실제 Master 응답에서 생성된다는 점이 동시 궤적 시험과 다릅니다.

Master 루프도 u₁부터 전송하고 전송 후 다음 시각까지 기다립니다. 예정 주기를 넘기면 다음 deadline을 현재 시각으로 재설정하므로, 실행 시간이 길어진 구간을 명령 주파수 설정만으로 복원할 수는 없습니다. 실제 명령 history와 motion log의 시간축을 따로 남겼습니다.

## 2. Actual Follower와 Preview

### 2.1 실제 움직임 이벤트와 최근 명령 매칭

dL,k=pL,k−pL,0,‖dL,k−dL,k−1‖≥ε,v̂k=0.82v̂k−1+0.18dL,k−dL,k−1ΔtkActual 움직임 검출과 속도 추정
Watcher는 현재 actual과 직전 게시 actual의 상대 위치 차이가 detect tolerance 이상일 때 event를 만듭니다. event에는 상대 위치·필터링한 속도·감지 시각·추정 command sequence·매칭 오차가 들어갑니다. 매 poll을 FIFO로 쌓지 않고 최신 스냅샷을 게시합니다.

매칭은 최근 command history를 역순으로 훑어 거리 오차가 작은 후보를 갱신하고, 1.5 mm 이내 후보를 찾으면 종료합니다. 따라서 전체 이력의 전역 최솟값 탐색이나 정확한 인과 추적 ID가 아닙니다. 주기 운동에서는 비슷한 위치가 반복되므로, 이 추정 send 시각은 진단·preview 조정용으로 사용하고 최종 actual 지연 판정과 분리했습니다.

### 2.2 Slave 목표와 재전송 조건

Relay는 latest event의 상대 actual을 기본 target으로 삼습니다. 새로운 sequence가 왔거나, 마지막 전송 target과의 차이가 resend tolerance 0.03 mm 이상이면 갱신합니다. 정지한 actual의 불필요한 명령 반복과 오래된 event backlog를 줄이기 위한 구조입니다.

Right의 절대 reference는 Right 시작 위치에 relay 상대 목표를 더한 값입니다. 원본은 Left 시작 위치와 초기 양팔 offset의 합으로 같은 기준을 구성합니다. Source actual, preview된 relay reference, controller pdes를 각각 저장해 목표가 어느 단계에서 달라졌는지 추적했습니다.

### 2.3 원호 기하를 유지하는 Velocity Preview

sarc=clip(vtanhg,−c,c),θpreview=θ+sarcr원호 방향 preview — 길이 mm를 위상 rad로 변환
상대 XZ 원의 중심은 (−r,0)입니다. 현재 점에서 중심을 뺀 radial 단위벡터를 uᵣ, 반시계 접선 단위벡터를 uₜ=(−uᵣ,z,uᵣ,x)로 만들고, v_tan=vₓ𝓏·uₜ로 부호 있는 접선 속도를 얻습니다. h는 초, g는 배율이므로 v_tan·h·g는 mm 길이가 됩니다.

그 길이를 cap으로 제한하고 r로 나눈 위상만큼 원 위에서 앞당깁니다. 단순 p+vh 선형 외삽은 원의 접선 방향으로 나가며 곡률 때문에 진폭을 바꿀 수 있습니다. 원호 preview는 현재 측정 위상을 출발점으로 원 반지름을 유지하도록 구성했습니다. 원형 시험의 기하를 활용한 보상이며 임의 톤백 조작 전체에 바로 적용한 일반 예측기라고 주장하지 않습니다.

이 보상은 actual에서 현재 위상을 읽지만, 반지름은 nominal r로 재투영합니다. 따라서 actual의 방사 방향 편차를 그대로 복사하는 follower와는 다릅니다. 지연이 줄어도 residual 형상 오차를 따로 확인한 이유가 여기에 있습니다.

### 2.4 Adaptive Horizon과 Cap의 실제 의미

h=median(Drecent),ceffective=max(cbase,2πrThκ)Adaptive horizon과 유효 preview cap
최근 command-send→actual-detect 지연을 20–250 ms 범위로 제한해 보관하고 최근 31개 median을 사용합니다. 이력이 6개보다 적을 때는 기본90 ms와 median 중 큰 값을 쓰며, 충분히 쌓이면 median 자체를 사용합니다. 항상 max(90 ms,median)을 쓰는 구조는 아닙니다.

유효 cap은 max(10 mm, (2πr/T)h×1.25)입니다. r100 mm·T5 s·h90 ms이면 nominal speed는 약125.66 mm/s이고 유효 cap은 약14.14 mm가 됩니다. 따라서 10 mm를 고정된 전 구간 상한이라고 설명하지 않았습니다. 이 계산은 설정 해석 예이며 측정된 preview 사용량이 아닙니다.

Nominal-phase 모드도 비교용 대안으로 남아 있지만 최종 main 설정은 velocity입니다. 설정 파일의 지원 옵션과 해당 시험에 적용한 옵션을 나누었습니다.

히스토리 갱신은 relay polling 경로에 있으므로 같은 actual event를 여러 번 읽으면 같은 지연값이 반복 저장될 수 있습니다. 최근31개 항목을31개의 독립적인 측정 event와 동일하게 해석하지 않았습니다. Horizon을 분석할 때는 sequence와 갱신 빈도도 함께 보아야 합니다.

### 2.5 Send·Detect·Relay Timing과 Motion Latency

시간 지표의 경계
| 간격 | 정의 | 포함하지 않는 것

| Left→detect | actual 감지 시각−매칭 Left send 시각 | 정확한 센서 timestamp와 같은 값은 아님

| Detect→Right send | relay send−actual 감지 | Right 실제 이동 완료

| Left→Right send | 두 send 시각 차이 | 양팔 actual의 대응 위상 도달 시간

| Actual landmark latency | Right actual crossing−Left actual crossing | 단순한 send 간격으로 대체 불가

코드는 event 감지 시간에 perf_counter를 쓰고 motion log에는 상대 시간축을 저장합니다. 명령과 실제 운동은 서로 다른 관측이므로, timing log의 짧은 relay 시간이 그대로 50 ms KPI 통과를 뜻하지 않습니다.

Actual event의 detect_t는 상태 조회 호출을 시작하기 전에 읽은 Host perf_counter 값입니다. 제어기가 상태를 측정한 하드웨어 시각과 동일하지 않습니다. 이 시간 차와 최근 command 매칭의 불확실성을 final actual landmark 지연과 구분했습니다.

## 3. 계측·위상·평가 수식

### 3.1 Raw Log와 세 종류의 Reference

위치 신호별 비교
| 비교 | 결과가 의미하는 것

| Left actual − Left pdes | Master 내부 desired 추종

| Right actual − Right relay reference | Follower 알고리즘 목표 대비 실제 차이

| Right actual − Right pdes | Right 제어기 내부 desired 추종

| Right relative actual − Left relative actual | 보상 전 동시각 운동 차이

| Right relative actual − shifted Left | 평균 지연 정렬 뒤 남는 잔차

동작 시작 전 정지 구간을 잘라내고, 유효 시작 샘플을 기준으로 시간·각 팔 초기 위치를 재정렬합니다. 시작 검출은 위치 차분/실제 Δt의 속도가 0.8 mm/s를 넘는 첫 구간을 사용합니다. 팔별 위치·자세·pdes와 Right reference를 같은 row에 모아 후처리했습니다.

### 3.2 평평한 Peak 대신 원 위상 복원

[그림: 직접 작성한 위상 통과시각 비교와 residual 분리 설명도. 선과 시간은 측정 trace가 아닌 계산 개념입니다.]

직접 작성한 위상 통과시각 비교와 residual 분리 설명도. 선과 시간은 측정 trace가 아닌 계산 개념입니다. 크게 보기 ↗

ca=Q1,a+Q99,a2,ba=max(Q99,a−Q1,a2,ε),φ=unwrap(atan2(z−czbz,x−cxbx))Percentile 기반 원 위상 복원
원형 운동의 꼭대기는 파형 기울기가 작아 peak index가 노이즈·샘플 간격에 민감할 수 있습니다. 최종 분석은 축 값에서 국소 peak를 직접 찾는 대신 X/Z를 각각 1·99 percentile 중심과 반폭으로 정규화하고 atan2로 원 위상을 복원합니다.

위상을 unwrap하고 회전 방향을 반영한 뒤 시작 lap 기준으로 정렬합니다. 작은 역행은 누적 최댓값으로 단조화합니다. Percentile 정규화는 지연 계산을 위한 위상 복원에만 쓰며, 위치 sync 오차를 계산할 actual 좌표까지 정합하거나 정밀도를 높이는 처리로 쓰지 않습니다.

### 3.3 대응 위상과 Crossing Time 보간

t(φ*)=ti+φ*−φiφi+1−φi(ti+1−ti)두 샘플 사이의 위상 통과 시각 보간
X의 landmark는 nπ, Z는 π/2+nπ입니다. 두 팔이 같은 landmark를 통과한 인접 두 샘플을 찾고 선형보간으로 시각을 계산합니다. 100 Hz 기록에서 10 ms 샘플 간격보다 세분된 추정값을 얻지만, 이것이 센서 시간 정확도까지 1 ms 이하라는 뜻은 아닙니다.

시작점에 걸린 X의 첫 max landmark는 제거합니다. 두 trajectory의 공통 위상 범위 밖이거나 보간이 불가능한 점은 쓰지 않고, |lag|가 250 ms를 넘는 매칭도 제외합니다. 유효 event 수와 제외 조건을 함께 확인해야 큰 지연이 단순히 통계에서 빠지는 상황을 구별할 수 있습니다.

### 3.4 Signed·Absolute·RMS·Worst-case 판정

ℓa,j=1000(tR,a,j−tL,a,j),Jtrial=max(|ℓX,j|,|ℓZ,j|)Actual 대응 위상의 지연과 trial 판정 — ms
Elat,RMS=∑j=1Mℓj2M,J̄trials=∑n=120Jn20Event RMS와 반복 trial judge의 평균은 다른 통계
양수 signed lag는 Right가 늦다는 뜻이고 음수는 앞선다는 뜻입니다. 절댓값 배열로 Mean·RMS·P95·Max를 계산하고, 부호 평균도 따로 보관합니다. 보상이 앞섬을 만들 수 있으므로 음수를 모두 제거하거나 0으로 바꾸지 않았습니다.

Trial의 주판정은 max(max|lag_X|,max|lag_Z|)입니다. RMS는 한 trial의 event 지연 제곱 평균의 제곱근, 20-trial 평균 judge는 각 trial 최댓값의 산술평균입니다. 이 세 통계를 모두 “평균 latency”로 쓰면 통과 여부가 달라질 수 있습니다.

### 3.5 Online Preview와 별도의 시간 정렬 잔차

d̃L,x(t)=dL,x(t−ℓ̄x),eres(t)=dR(t)−d̃L(t),Eres=∑i=1N‖eres,i‖2N양의 lag이면 Right(t)와 Left(t−lag)를 비교
분석에서는 X/Z의 signed mean lag를 초로 바꾸어 Left(t−lag)를 보간하고 Right(t)와 비교합니다. 양의 lag이면 느린 Right에 맞는 과거 Master 위치를 참조합니다. Y는 시간 이동하지 않습니다. 유효 보간 범위 밖의 양 끝 샘플은 residual 계산에서 제외합니다.

이는 실행 중 목표를 앞당기는 online preview와 다른 오프라인 분석 정렬입니다. 일정 지연을 제거해도 가변 지연·형상·진폭 차이가 남을 수 있습니다. 또한 축마다 다른 평균 lag를 쓰므로 이 residual은 특정 보정 규칙의 진단값이며, 물리 시스템의 지연 자체가 사라졌다는 뜻은 아닙니다.

### 3.6 자세와 Tracking을 분리해 해석

va,k=180πLog(Ra,0TRa,k),eori,k=vR,k−vL,k초기 자세에 정렬한 상대회전 벡터의 차이 — degree
자세는 각 신호의 초기 회전 기준 rotvec 변화량으로 비교합니다. Left는 actual/pdes, Right는 Right/Left actual 변화를 각각 비교합니다. 회전 명령을 0으로 둔 원운동이므로 위치 follower의 시간 응답을 대체하는 주지표로 쓰지 않습니다.

Right relay reference 오차가 큰데 pdes tracking은 작은 경우, 우선 reference→제어기 desired 경로와 시간축을 나누어 봐야 합니다. 반대로 pdes tracking까지 커지면 내부 목표 추종을 추가로 살펴야 합니다. 단일 통계만으로 제어기 내부 필터나 특정 기계 원인을 확정하지 않습니다.

## 4. 재시험 그래프

### 4.1 20회 Actual Latency 반복 그래프

[그림: X축 trial별 worst landmark latency]

KPI재실시, slide 2의 X축 peak-to-peak 반복 그래프. 각 점은 trial 내 X landmark의 최대 절대 지연이며, 50 ms 선과 비교합니다. 크게 보기 ↗

[그림: Z축 trial별 worst landmark latency]

같은 슬라이드의 Z축 반복 그래프. 축별 평균의 max와 trial별 max를 평균한 값은 다르므로, 최종 판정에는 trial judge를 따로 사용했습니다. 크게 보기 ↗

### 4.2 실제 응답과 Peak 주변 확대

[그림: X축 actual 상대 위치 파형]

KPI재실시, slide 2의 양팔 X 위치 파형. 비슷한 형상에도 작은 위상차가 있으며, 원 전체 그림만으로 ms 지연을 읽기 어렵습니다. 크게 보기 ↗

[그림: X축 peak 주변 시간차]

같은 슬라이드의 X 확대 예시. 그림의 39.17 ms는 특정 landmark의 지연이며 trial 전체 최댓값이나 20회 평균이 아닙니다. 크게 보기 ↗

[그림: Z축 peak 주변 시간차]

같은 슬라이드의 Z 확대 예시. 이 구간은 약45.87 ms입니다. 대표 구간 확대와 반복 결과 표를 함께 읽습니다. 크게 보기 ↗

## 5. 결과·버전·Engineering Note

### 5.1 20회 반복 결과와 평균 달성 여부

20회 반복 시험의 주요 통계
| 지표 | 결과 | 기준·의미

| X trial max의 평균 | 46.675 ms | 50 ms

| Z trial max의 평균 | 47.694 ms | 50 ms

| Trial judge 평균 | 48.969 ms | 각 trial의 max(Xmax,Zmax)를 평균

| Trial judge 통과 | 15/20 trials | ≤50 ms

| Trial judge 범위 | 44.568–59.464 ms | 평균으로 가려지는 변동

| Lag-compensated sync RMSE 평균 | 1.351 mm | 보조 기준1.0 mm 초과

| Left actual/pdes RMSE 평균 | 0.107 mm | 보조 기준0.1 mm 초과

| Right actual/pdes RMSE 평균 | 0.215 mm | 보조 기준0.1 mm 초과

| Right actual/reference RMSE 평균 | 22.176 mm | relay reference와 내부 desired를 구분

20회 반복 시험에서 평균 latency 목표는 충족했고, 모든 반복 trial이 통과하지는 않았습니다. 보조 정밀도 지표도 별도로 남겼습니다. 자세 보조 지표는 Left tracking0.0185°, Right/Left sync0.0340°입니다.

### 5.2 대표 회차와 Outlier의 구분

전체 평균에 가까운 대표 Trial 04는 X46.267 ms, Z49.118 ms, judge49.118 ms입니다. 전체 평균에 가까운 회차라는 의미이지 가장 좋은 회차를 고른 것은 아닙니다. 최저 judge는 Trial 07의44.568 ms, 최고는 Trial 03의59.464 ms입니다.

Outlier 원인을 특정하려면 해당 회차의 위상 매칭 event 수·raw actual·timing log·preview horizon을 함께 봐야 합니다. 지금 통계만으로 OS 지연, 패킷 손실, servo variation 중 하나를 확정하지 않았습니다.

### 5.3 초기 약10 ms와 최종 약49 ms를 섞지 않은 이유

초기 발표의 X/Z RMS 평균은12.168/10.259 ms였고, 초기 이벤트 구조와 local peak 분석을 사용했습니다. 최종 시험은 Left actual watcher를 분리하고, actual follower·preview와 위상 landmark worst-case judge를 사용합니다. 신호 경로와 통계가 달라 숫자 차이를 성능 악화나 개선으로 직접 계산하지 않았습니다.

초기 PPT 표에는 latency 열에 mm 표기가 섞인 곳도 있어, 시간 지표는 본문 정의에 따라 ms로 정리했습니다. 최종 분석은 raw local maximum 위치를 그대로 peak로 삼는 설명보다 실제 코드의 normalized-phase crossing을 기준으로 작성했습니다.

### 5.4 Engineering Note

같은 궤적을 두 팔에 보내는 것과 한 팔의 실제 움직임을 관측해 다른 팔에 전달하는 것은 제어 문제 자체가 달랐습니다. 이 작업을 통해 응답성의 숫자를 먼저 낮추기보다, 입력에서 물리 응답까지 어떤 인과 경로를 측정하는지 정하는 것이 우선이라는 점을 배웠습니다.

Preview를 넣자 시간차만으로는 follower 상태를 충분히 설명할 수 없었습니다. 실행 중 보상과 분석 단계의 정렬을 나누고, 지연 뒤에도 남는 위치 잔차를 함께 보면서 빠르게 따라가는 것과 같은 형상으로 따라가는 것을 독립적으로 검증하는 방법을 익혔습니다.

CONTINUE READING

## Related Records

Technical Report

### 양팔 동기 오차 평가

공통 원궤적 입력, pdes tracking과 상대변위 sync, 좌표 정렬 방식의 변경 및 반복 시험 결과.
↗

Work Area

### POSCO 톤백 자동화

톤백 양팔 자동화의 시스템 구성, 비전 테스트베드, KPI 측정·결과, Replay 적용과 평가·시연 지원 기록.
↗
