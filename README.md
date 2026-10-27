# 🚦 신호등 토론

6학년 사회 6-2 「기업의 자유와 사회적 책임」 신호등 토론용 웹앱.
Next.js 16 · Tailwind · Supabase · Vercel. 화면은 모두 **가로형**(TV·태블릿 가로)으로 꽉 차게 만든다.

## 처음 설정 (선생님이 1번만)

### 1. Supabase 프로젝트
1. https://supabase.com → **New project** (Region: Northeast Asia (Seoul))
2. 왼쪽 **SQL Editor → New query** → `supabase/migrations/001_init.sql` 내용을 전부 붙여 넣고 **Run**
3. **Authentication → Sign In / Providers → Email**: 켜져 있는지 확인
   - 가입 확인 메일이 귀찮으면 *Confirm email*을 끄고, 가입이 끝나면 *Allow new users to sign up*도 꺼 두기

### 2. 환경 변수 (`.env.local`)
`.env.example`을 복사해 `.env.local`을 만들고 값을 채운다. **키는 채팅·GitHub에 올리지 않는다.**

| 이름 | 어디서 복사 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API Keys → `anon`(또는 publishable) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | API Keys → `service_role`(또는 secret) 키 — **비밀** |
| `STUDENT_SESSION_SECRET` | 아래 명령으로 만든 무작위 문자열 — **비밀** |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 3. 실행
```bash
npm install
npm run dev
```
http://localhost:3000 → 선생님 로그인 → 가입 → 학급 만들기 → 학생·PIN

## 화면
| 주소 | 누가 | 내용 |
|---|---|---|
| `/` | 모두 | 학생 / 선생님 입구 |
| `/teacher` | 교사 | 수업 코드, 토론 목록 |
| `/teacher/students` | 교사 | 명단 붙여넣기, PIN 카드 인쇄, 모둠·대표, 잠금 풀기 |
| `/s` | 학생 | 코드 → 번호 → PIN |
| `/s/debate` | 학생 | 단계에 맞는 화면 하나 (3초마다 새로 고침) |

## 개발 규칙
- push 전에 `npm run lint && npm run build`
- DB 변경은 `supabase/migrations/*.sql`로만
- 학생은 Supabase에 직접 접근하지 않고 `/api/s/*`만 쓴다 (service_role 키는 `src/lib/supabase/admin.ts`에서만)
