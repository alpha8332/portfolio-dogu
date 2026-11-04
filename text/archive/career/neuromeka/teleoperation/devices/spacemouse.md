# SpaceMouse · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/teleoperation/devices/spacemouse.html

장치 원리

# SpaceMouse

6축 입력을 속도로 해석하고 적분해 로봇 target을 만드는 원리.

TeleoperationSpaceMouseRate Control

MY ROLE
장치 사용 · 입력과 로봇 제어 경로 이해

DOCUMENT
Technical Report

SpaceMouse의 6축은 절대 위치가 아니라 캡을 밀고 비튼 입력입니다. MiMicX에서는 이를 목표의 변화 속도로 해석하고, 시간을 적분한 virtual pose를 현재 로봇 기준 자세에 합성했습니다.

## 1. 입력·장치 식별·신호 처리

### 1.1 Six Axes Measure Input, Not Hand Position

[그림: SpaceMouse Wireless]

SpaceMouse Wireless
상단 캡의 이동·비틀기와 두 버튼을 확인할 수 있는 제품군 사진입니다. 캡의 공간 위치를 추적하는 장치와 구분합니다.

3Dconnexion · 공식 제품 이미지

USB HID report에서 병진 x/y/z와 회전 roll/pitch/yaw를 읽습니다. Adapter는 signed 축 값을 대략 ±350 범위에서 정규화해 −1…1 입력으로 제공합니다. 이 값은 캡을 누르는 방향·정도이며, 장치가 작업 공간의 어디에 있는지를 나타내지 않습니다.[3DX]

같은 크기로 계속 누르면 이동 목표가 계속 증가하고, 놓으면 추가 적분이 멈춥니다. 이 특성 때문에 큰 팔 움직임 없이 조그할 수 있지만, 입력이 얼마나 오래 유지됐는지를 함께 해석해야 합니다.

### 1.2 From HID Bytes to a Dimensionless Six-Axis Sample

[그림: HID report에서 6축 sample로 가는 설명도. 축과 버튼 패킷은 별도 경로로 모이며, 정규화한 축 값 자체에는 mm나 degree 단위가 없습니다.]

HID report에서 6축 sample로 가는 설명도. 축과 버튼 패킷은 별도 경로로 모이며, 정규화한 축 값 자체에는 mm나 degree 단위가 없습니다. 크게 보기 ↗

HID report의 첫 byte로 packet 종류를 나누고, 축 packet에서는 여섯 signed 16-bit 값을 읽습니다. 각 두 byte는 little-endian 정수로 해석합니다. 부호 없는 값 u가 32768 이상이면 u−65536으로 바꾸므로 음의 방향 입력을 복원할 수 있습니다. 이 adapter가 지원하는 packet 형식을 기준으로 하며 모든 SpaceMouse 모델의 report descriptor가 같다는 뜻은 아닙니다.

u=256bhi+blo,ai=clip(rawi,−350,350)350Signed decoding and normalization
rawᵢ는 signed decoding 후 값입니다. 약 ±350을 ±1로 정규화하고 범위 밖은 clip합니다. 예를 들어 175는 0.5, −350은 −1입니다. 여기서 0.5는 TCP 0.5 mm가 아니라 캡 입력 강도입니다. 속도와 시간 적분을 거친 뒤에야 위치 단위를 갖습니다.

수신 sample의 성분
| 필드 | 의미 | 후속 처리

| axes x/y/z | dimensionless 병진 입력 | mask·mapping·deadzone

| roll/pitch/yaw | dimensionless 회전 입력 | rad/s로 변환 후 SO(3) 적분

| left/right buttons | bit mask를 개별 버튼으로 분리 | 설정된 action

| timestamp | adapter 수신 sample 시각 | 적분 간격 계산

축 packet이 없으면 이전 축을 무한히 유지하지 않고 해당 read의 축을 0으로 둡니다. 버튼 packet이 없으면 마지막 버튼 상태를 보존할 수 있습니다. 따라서 중립 입력, 버튼 미갱신, 연결 자체의 실패를 같은 상태로 취급하지 않습니다.

### 1.3 Bind Physical Identity Before Mapping Axes

두 대를 사용할 때 enumerate 순서로 left/right를 정하면 재연결 후 서로 다른 팔에 명령할 수 있습니다. Physical device identity와 robot·arm binding을 먼저 고정하고 그 안에서 axis_map·부호·버튼 action을 해석합니다. Catalog에 장치가 뜨는 것과 실제 HID open/read 성공도 별도 확인했습니다.

새 등록의 기본 배율은 translation_scale=5.0, rotation_scale=1.0입니다. Worker의 누락 값 fallback과 등록 default는 같은 정의가 아니므로, 실제 binding params를 보고 조작 감도를 판단합니다.

### 1.4 Raw Mask Before Signed Axis Mapping

amapped=PMmodea,MA=diag(1,1,1,0,0,0),MB=diag(0,0,0,1,1,1)Conditioning order
a의 순서는 x,y,z,roll,pitch,yaw입니다. M은 raw 축을 통과·차단하는 mask이고 P는 axis_map의 재배치와 부호 반전을 표현하는 행렬입니다. 실제 처리 순서는 raw mask → signed mapping입니다. A의 기본값은 병진, B는 회전입니다. 사용자 mask로 일부 축만 켜거나 끌 수 있습니다.

순서는 교차 mapping에서 중요합니다. 예를 들어 출력 x가 raw roll을 읽도록 설정돼도 A mode가 raw roll을 먼저 차단하면 x에는 0이 들어갑니다. 반대로 mapping 이후 병진 출력 mask를 적용하면 같은 설정에서 회전 raw 값이 병진 출력으로 살아남습니다. P와 M은 일반적으로 교환할 수 없습니다.

기본 mapping은 같은 이름의 축을 읽고, −x처럼 지정하면 부호를 뒤집습니다. Raw roll/pitch/yaw 입력을 최종 robot Euler angle로 곧바로 간주하지 않습니다. 이 단계의 회전 축도 뒤의 속도 계산에 사용할 dimensionless 입력입니다.

### 1.5 Deadzone Rescaling and Sensitivity Near Neutral

D(a)={0|a|≤dsign(a)|a|−d1−dotherwiseNormalized axis after a rescaled deadzone
0≤d<1에서 위 식을 축마다 적용합니다. d=0.3이면 입력 0.3까지는 0이고, 0.65는 (0.65−0.3)/(1−0.3)=0.5입니다. 음의 입력도 부호를 보존해 같은 크기로 처리합니다. 구현은 d를0~1로 제한하며 d≥1이면 모든 축을 0으로 만듭니다.

d=0.3의 계산 예
| 입력 a | 처리 후 D(a) | 의미

| 0.20 | 0 | 작은 입력 억제

| 0.30 | 0 | 경계에서 연속

| 0.65 | 0.50 | 남은 구간을 다시 정규화

| −1.00 | −1.00 | 끝단 범위 유지

Deadzone 밖을 원래 값 그대로 통과시키면 0에서0.3으로 출력이 뛰는 경계가 생깁니다. Rescaling은 이 점프를 줄이는 대신 작은 의도 입력도 덜 민감하게 만듭니다. Gain을 낮추는 것과 중립 구간을 넓히는 것은 다른 조작 감도를 만듭니다.

## 2. 시간 적분과 가상 pose

### 2.1 Timestamp Rules Before Any Integration

Δtk=min(tk−tk−1,0.25)Positive integration interval with a cap
이 식은 두 timestamp가 유효하고 증가한 경우에 적용합니다. 첫 sample은 이전 시각이 없어 저장만 하고 목표를 만들지 않습니다. timestamp가0이거나 감소·동일하면 그 update의 적분을 건너뜁니다. 양의 간격만 최대0.25 s로 제한합니다.

control_period=0.02 s라는 설정이 있어도 SpaceMouse의 이 경로는 매번 고정20 ms를 적분하지 않습니다. Sample timestamp 차이를 사용합니다. 정지·지연 후 오래된 간격을 그대로 적용하면 작은 입력으로도 큰 목표 점프가 생기므로 cap을 둡니다. 이 cap은 robot의 충돌 방지나 실제 추종 오차 제한을 대신하는 값은 아닙니다.

### 2.2 Velocity Scaling and Time Integration

v=10stut,ω=π18010srurPer-axis velocity
ok=ok−1+vkΔt,Vk=Vk−1Exp(ωkΔt)Accumulate a virtual pose
첫 sample은 시간 기준만 저장하고 target을 적분하지 않습니다. 유효 timestamp가 없거나 시간이 증가하지 않으면 새 목표를 만들지 않고, 증가한 간격은 최대 0.25 s로 제한합니다. 등록 기본값에서 축별 최대 목표 변화 속도는 병진 50 mm/s, 회전 10°/s입니다. 여러 축을 동시에 넣으면 vector norm은 더 커지므로 전체 공간 속력 상한으로 표현하지 않습니다.

예를 들어 d=0.3, raw-normalized x=0.65, s_t=5, Δt=0.02 s이면 u=0.5, v_x=25 mm/s, Δx=0.5 mm입니다. 입력 유지 시간이 1 s로 관측돼도 현재 적분 상한은 0.25 s이므로 해당 한 번의 증가량은 6.25 mm입니다. 이는 지연 보상이나 실제 추종 정확도 측정이 아닙니다.

### 2.3 Angular Velocity to an SO(3) Increment

δθk=ωkΔtk,ΔRk=Exp(δθk)Axis-angle increment
δθ는 roll·pitch·yaw에 단순히 더할 세 각도가 아니라, 회전축 방향과 rad 단위 회전각을 담은 rotation vector입니다. θ=‖δθ‖, a=δθ/θ로 두면 회전 증분은 아래 Rodrigues 형태로 이해할 수 있습니다. θ=0일 때는 identity입니다.

ΔRk=I+sin(θ)[a]×+(1−cos(θ))[a]×2Exponential map on a rotation vector
[a]×는 a와의 cross product를 수행하는 skew matrix입니다. 예를 들어 정규화 yaw 입력1, rotation_scale1, Δt0.02 s이면 각속도10°/s에서0.2° 회전 증분을 만듭니다. Exp는 이 증분을 행렬로 바꾸므로 여러 축 동시 입력과 순차 회전의 곱을 다룰 수 있습니다.

### 2.4 Virtual Pose: Initial State and Ordered Accumulation

Tv,k=[Vkok0T1],o0=0,V0=IVirtual transform and initialization
ok=ok−1+vkΔtk,Vk=Vk−1ΔRkAccumulate translation and rotation
o는 mm 단위 누적 이동, V는 누적 회전입니다. 병진은 현재 구현에서 누적 벡터에 그대로 더하고, 회전은 이전 virtual rotation의 오른쪽에 새 증분을 곱합니다. 병진을 매번 tool orientation으로 회전시키는 적분이라고 설명하면 실제 계산과 달라집니다.

회전은 교환법칙이 성립하지 않습니다. x축 회전 후 y축 회전과 그 반대 순서는 일반적으로 다른 자세를 만듭니다. 따라서 virtual pose의 상태와 곱셈 순서를 보존해야 같은 캡 동작이 같은 로봇 목표를 만듭니다.

## 3. 로봇 목표와 상태 전환

### 3.1 Compose the Absolute TCP Target

pcmd=p0+o,Rcmd=VR0Virtual motion → absolute target
V의 누적은 V←V Exp(ωΔt)이지만 최종 회전은 V R₀ 순서입니다. 같은 rotation vector라도 기준 회전의 왼쪽과 오른쪽에 곱하면 해석하는 축이 달라집니다. 이 구현의 순서를 임의의 tool-frame jog 공식으로 바꾸지 않았습니다. 결과는 mm·RPY degree의 task target으로 전송합니다.

pcmd,k=p0+∑i=1kviΔti,Rcmd,k=(∏i=1kExp(ωiΔti))R0Unrolled target inside one active accumulation segment
위 곱은 ΔR₁ΔR₂…ΔRₖ처럼 sample 시간순으로 오른쪽에 새 증분을 붙이는 순서입니다. 이 전개는 한 번의 활성 누적 구간에 적용합니다. 중립에서 base와 accumulator를 재설정했다면 새 구간의 시작점도 바뀌므로 episode 전체에 같은 p₀·R₀를 고정한 식으로 사용하지 않습니다.

### 3.2 Final Six-Value Target and the Controller Boundary

ξcmd=[pxpypzrollpitchyaw]T,R=Rz(yaw)Ry(pitch)Rx(roll)Indy task command representation
위치 세 값은 mm, roll·pitch·yaw 세 값은 degree로 인코딩해 absolute task target으로 보냅니다. 회전 행렬 계산에는 rad 단위 rotation vector를 사용하고, 최종 SDK 경계에서만 RPY degree로 바꿉니다. “6D pose”는 위치+회전 표현의 성분 수이며 로봇의 관절 수를 새로 정의하는 말이 아닙니다.

Robot worker는 이 목표와 velocity/acceleration ratio, 대상 arm index를 함께 Task TeleMove 명령으로 전달합니다. 상대 입력에서 계산했어도 최종 명령은 movetelel_abs입니다. Robot-base target과 모니터링용 다른 frame의 pose를 바꾸어 전송하면 좌표가 달라지므로 명령 source를 고정했습니다.

이 운영 경로에서는 live op_state의 TELE_OP 값17을 읽어 teleop 입력 분기로 들어갑니다. 설정 화면의 mode 이름만으로 명령을 실행하지 않습니다. SDK velocity/acceleration ratio는 controller 명령에 붙는 비율이고, 위의 translation/rotation scale은 입력 변화에서 목표를 만드는 배율입니다. 두 값을 같은 gain으로 묶지 않습니다. 저장된 command의 한 sample은6개 값이며 시간축으로 쌓인 배열은(T,6)입니다.

MiMicX는 목표를 만들고 전송하는 상위 계층입니다. 역기구학과 실제 joint 추종은 robot controller가 수행합니다. SDK 호출 성공, 실제 pose feedback의 변화, 물체 조작 완료는 각각 다른 확인입니다. 목표 값만 움직인다고 실제 팔이 따라갔다고 판단하지 않았습니다.

### 3.3 Neutral, Release and Task TeleMove Exit

입력과 상태 전이
| 조건 | virtual/base 처리 | 명령

| 첫 timestamp | 시각만 저장 | 새 target 없음

| 활성 축 입력 | o,V 갱신 | absolute target

| 움직임→중립 | virtual identity / 현재 robot pose로 base 갱신 | 현재 pose 한 번 송신

| 중립 지속 | 추가 적분 없음 | 새 target 없음

| Task TeleMove 이탈 | binding의 live 상태 전체 정리 | 해당 teleop 경로 처리 중단

중립 전환에서는 마지막으로 계산했던 먼 target을 계속 유지하는 대신 실제 측정 pose를 새 기준으로 삼습니다. 입력을 다시 주면 virtual pose가 identity에서 시작하므로 중립 이전의 누적량이 다시 더해지지 않습니다. 이 동작이 release re-anchor입니다.

입력의 아주 작은 증분은 수치 임계값 아래일 때 움직임 없음으로 처리합니다. 중립 감도, sample 시간, 현재 feedback이 모두 다음 시작점에 영향을 줍니다. Stop을 단순히 6축0으로 바꾸는 한 줄로 보지 않고 상태 전이로 다룬 이유입니다.

## 4. 조작과 설계 판단

### 4.1 Operational Checks and Tradeoffs

확인 순서
| 단계 | 확인 내용

| 연결 | HID identity·open·sample 변화

| 단일 축 | 양·음 방향, mask·mapping·gain

| 중립 | 미세 잡음과 실제 inactive 전환

| 재시작 | 현재 위치에서 새 방향 입력

| 양팔 | 각 입력이 자신의 arm·gripper만 제어

접촉 전에는 이동·회전 mask를 나눠 원치 않는 동시 입력을 줄일 수 있습니다. 다만 두 mode를 바꾸는 동안 조작이 끊기므로 작업 순서에 맞춰 선택합니다. 버튼 기능과 이동은 같은 owner에 연결되어야 합니다.

### 4.2 Engineering Note

속도형 입력에서 중립은 단순한0 입력이 아니라 다음 조작의 시작점을 정하는 상태 전이였습니다. Gain이나 deadzone만 조정해도 release 후 기준점이 잘못 남으면 자연스러운 조그를 만들 수 없습니다. 입력의 크기와 적분 상태의 수명을 함께 설계해야 한다는 판단이 남았습니다.

또한 같은 여섯 숫자라도 raw 축, 속도, 누적 pose와 SDK target은 단위와 의미가 다릅니다. 축 방향 문제를 gain으로 덮거나 지연 문제를 위치 오차로만 보지 않고, 어느 단계의 값인지 먼저 구분하게 됐습니다.

## References

- [3DX] 3Dconnexion — SpaceMouse Wireless
제조사 6DoF 센서·제품 외형 참고. 로봇 속도 적분과 배율은 MiMicX 구현입니다.

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

### Docker·장치 연동

SpaceMouse·카메라의 직접 접근과 Vive·Quest/Pico의 Host VR bridge를 Docker 배포에 연동·안정화했습니다.
↗
