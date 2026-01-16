# 메이크에듀(MakeEdu) 연동 크롬 확장프로그램 개발 계획서

## 1. 목표 (Goal)
`school.makeedu.co.kr` (메이크에듀)에서 발생하는 **'학생 등록'** 및 **'납부 완료'** 이벤트를 감지하여, 이를 `ijw-textbook.web.app` (교재 주문 시스템)의 데이터베이스에 자동으로 동기화합니다.
즉, 메이크에듀에서 처리하면 교재 시스템에서도 자동으로 **[등록]** 및 **[납부]** 체크가 되도록 만듭니다.

## 2. 시스템 아키텍처 (Architecture)
- **형태**: 크롬 브라우저 확장프로그램 (Chrome Extension Manifest V3)
- **동작 방식**:
    1.  **사용자**가 메이크에듀 사이트에서 작업(등록/납부)을 수행합니다.
    2.  **확장프로그램(Content Script)**이 이 동작을 감지하고 학생 이름과 처리 내용을 추출합니다.
    3.  **확장프로그램(Background Script)**이 추출된 정보를 바탕으로 파이어베이스(Firestore)에 접속하여 해당 학생의 교재 신청 내역 상태를 업데이트합니다.

## 3. 사전 준비 사항 (Prerequisites)

### 3.1 Firebase Firestore 보안 규칙 설정
> [!CAUTION]
> **필수 작업**: 현재 Firestore 보안 규칙이 설정되지 않아 `Missing or insufficient permissions` 에러가 발생합니다.

**Firebase Console 설정 방법:**
1. [Firebase Console](https://console.firebase.google.com) 접속
2. `ijw-textbook` 프로젝트 선택
3. 좌측 메뉴 **Firestore Database** → **규칙** 탭 클릭
4. 아래 규칙으로 교체 후 **게시** 클릭

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 설정 문서: 누구나 읽기/쓰기 가능
    match /settings/{document=**} {
      allow read, write: if true;
    }
    // 요청 문서: 누구나 읽기/쓰기 가능
    match /requests/{document=**} {
      allow read, write: if true;
    }
  }
}
```

> **참고**: 위 규칙은 개발/내부용입니다. 외부 공개 시 Firebase Auth 인증 추가 필요.

### 3.2 Firebase Storage 보안 규칙 설정 (이미지 업로드용)
1. Firebase Console → **Storage** → **Rules** 탭
2. 아래 규칙으로 교체:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /requests/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## 4. 구현 내용 (Proposed Changes)

### 4.1 프로젝트 구조
별도의 Git 저장소로 분리하여 관리합니다. (교재 시스템 빌드에 포함되지 않도록)

```
makeedu-sync-extension/    # 별도 저장소
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── firebase-config.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### 4.2 주요 구성 요소

#### `manifest.json` 설정
```json
{
  "manifest_version": 3,
  "name": "교재 시스템 연동",
  "version": "1.0.0",
  "description": "메이크에듀 ↔ 교재 주문 시스템 자동 동기화",
  "permissions": ["storage"],
  "host_permissions": [
    "*://school.makeedu.co.kr/*",
    "https://firestore.googleapis.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["*://school.makeedu.co.kr/*"],
    "js": ["content.js"]
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

#### `background.js` (백그라운드 스크립트)
-   **역할**: 파이어베이스 Firestore와 직접 통신하는 중계자.
-   **로직**:
    1.  Content Script로부터 `{ action: 'REGISTER', studentName: '홍길동', teacherName: '김선생' }` 메시지 수신
    2.  Firestore `requests` 컬렉션에서 **학생이름 + 담임선생님** 조합으로 검색 (동명이인 방지)
    3.  최근 7일 이내 생성된 문서 중 매칭되는 항목 찾기
    4.  해당 문서의 `isCompleted`/`isPaid` 필드를 `true`로 업데이트
    5.  처리 일시(`completedAt`, `paidAt`) 기록
    6.  성공/실패 결과를 Content Script로 반환

#### `content.js` (콘텐츠 스크립트)
-   **역할**: 메이크에듀 웹페이지 화면을 보고 있다가 특정 상황을 감지합니다.
-   **구현 단계**:
    -   **1단계 (수동)**: 화면 우측 하단에 플로팅 버튼 표시
        - **[등록 완료]** 버튼: 현재 화면의 학생을 "등록 완료" 처리
        - **[납부 완료]** 버튼: 현재 화면의 학생을 "납부 완료" 처리
        - 학생 이름은 페이지에서 자동 추출 시도, 실패 시 입력창 표시
    -   **2단계 (자동화)**: HTML 구조 분석 후 자동 감지 구현

#### `popup.html` / `popup.js`
-   확장프로그램 아이콘 클릭 시 나오는 작은 창입니다.
-   **기능**:
    -   **연결 상태**: Firestore 연결 상태 표시 (🟢 연결됨 / 🔴 오류)
    -   **최근 동기화 내역**: 최근 처리된 5건 표시
    -   **수동 동기화**: 학생 이름 직접 입력하여 처리

## 5. 학생 매칭 로직 (Student Matching)

동명이인 문제를 방지하기 위한 매칭 우선순위:

```javascript
// 1순위: 학생이름 + 담임선생님 + 최근 7일
query(
  collection(db, 'requests'),
  where('studentName', '==', studentName),
  where('teacherName', '==', teacherName),
  where('createdAt', '>=', sevenDaysAgo),
  orderBy('createdAt', 'desc'),
  limit(1)
)

// 2순위: 학생이름 + 최근 7일 (담임 정보 없을 때)
query(
  collection(db, 'requests'),
  where('studentName', '==', studentName),
  where('createdAt', '>=', sevenDaysAgo),
  orderBy('createdAt', 'desc'),
  limit(1)
)

// 매칭 결과가 2개 이상이면 사용자에게 선택 요청
```

## 6. 사용자 협조 요청 사항 (User Action Required)

### 6.1 Firebase 보안 규칙 설정
위 **3.1**, **3.2** 섹션의 보안 규칙을 Firebase Console에서 설정해주세요.

### 6.2 HTML 구조 분석 (자동화용)
> [!IMPORTANT]
> 2단계 자동화를 위해 메이크에듀 사이트의 HTML 정보가 필요합니다.

**필요한 정보:**
1. **학생 등록 화면**: "저장" 또는 "등록 완료" 버튼의 HTML
2. **납부 처리 화면**: "납부 확인" 버튼의 HTML
3. **학생 정보 표시 영역**: 학생 이름이 표시되는 요소의 HTML

**확인 방법:**
1. 해당 화면에서 `F12` (개발자 도구) 열기
2. 버튼/텍스트 요소를 우클릭 → "검사"
3. 해당 HTML 코드 복사하여 공유

## 7. 검증 계획 (Verification Plan)

### 7.1 확장프로그램 설치
1. 크롬 주소창에 `chrome://extensions` 입력
2. 우측 상단 **[개발자 모드]** 켜기
3. **[압축해제된 확장 프로그램을 로드합니다]** 클릭
4. `makeedu-sync-extension` 폴더 선택

### 7.2 테스트 시나리오
| # | 테스트 | 예상 결과 |
|---|--------|----------|
| 1 | 확장프로그램 설치 후 팝업 열기 | 연결 상태 🟢 표시 |
| 2 | 메이크에듀 사이트 접속 | 플로팅 버튼 표시 |
| 3 | [등록 완료] 버튼 클릭 | 교재 시스템에서 해당 학생 "등록" 체크 |
| 4 | [납부 완료] 버튼 클릭 | 교재 시스템에서 해당 학생 "납부" 체크 |
| 5 | 동명이인 학생 처리 | 선택 팝업 표시 |

## 8. 향후 개선 사항 (Future Improvements)
- [ ] Firebase Auth 연동 (보안 강화)
- [ ] 자동 감지 기능 (HTML 분석 후)
- [ ] 배치 처리 (여러 학생 한번에)
- [ ] 동기화 이력 대시보드
