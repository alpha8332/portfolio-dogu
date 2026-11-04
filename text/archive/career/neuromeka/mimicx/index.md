# MiMicX 플랫폼 개발 · Dongchan Shin Archive

Source: https://dongchan-portfolio.me/archive/career/neuromeka/mimicx/index.html

WORK AREA

# MiMicX 플랫폼 개발

MiMicX의 기능 확장·통합·안정화. 전체 흐름과 14개 개발 주제를 살펴봅니다.
플랫폼·학습 05

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

### Tesollo Hand 학습 파이프라인

핸드 데이터 수집·ACT 학습·출력 복원과 실제 핸드 추론을 연결했습니다.
↗

Technical Report

### 외부 모델 실행 연동 — SCDP

연구팀의 SCDP 모델을 MiMicX에서 실행: 16D rotvec adapter·입출력 계약·좌표 변환과 실로봇 확인.
↗텔레오퍼레이션·로봇 제어 04

Technical Report

### Linux Vive Tracking

독립 Vive 입력 수집·시각화와 MiMicX calibration 피드백을 구분해 설명합니다.
↗

Technical Report

### Robot Replay·안전 로직

HDF5 기록을 로봇에서 재생하고, 초기 자세 정렬과 본 재생을 분리했습니다.
↗

Technical Report

### 독립 다중 로봇 지원

독립된 Indy12 두 대의 session·소유권·raw schema를 설계하고 수집·학습·추론·시각화·Replay까지 연결했습니다.
↗

Technical Report

### XR 컨트롤러 응용

Quest/Pico의 pose 조작에 축 매핑 조그·analog 그리퍼·버튼 기반 수집과 모드 전환을 연결했습니다.
↗실행 환경·데이터 03

Technical Report

### Docker·장치 연동

SpaceMouse·카메라의 직접 접근과 Vive·Quest/Pico의 Host VR bridge를 Docker 배포에 연동·안정화했습니다.
↗

Technical Report

### Dataset QA

선택한 episode의 저장·시각화·학습 입력을 대조하는 내부 Dataset QA Checklist를 개발했습니다.
↗

Technical Report

### 런타임 로그·실행 상태 진단

제어 경로의 회귀를 피하면서 로그 기록과 운영 화면의 표시 원천을 정리했습니다.
↗안정화·기술 인수인계 02

Technical Report

### 기술 문서화·인수인계

기존 시스템을 이해한 내용을 온보딩·아키텍처·운영·진단 문서로 정리하고 전달했습니다.
↗

Technical Report

### 안정화·문제해결

장치·데이터·학습·실행의 오류를 아홉 분야로 나눠 원인 추적, 수정 과정과 회귀 검사를 설명합니다.
↗
