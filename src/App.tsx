import { useState } from 'react';

type Mode = 'learner' | 'instructor';
type LearnerStep = 'entry' | 'intro' | 'home';

const complianceWarning = '고객명, 병원명, 의사명, 내부 전략, 민감한 수치, 승인되지 않은 제품 표현은 입력하지 마세요.';

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}

function Button({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const className = variant === 'primary'
    ? 'bg-slate-900 text-white'
    : variant === 'secondary'
      ? 'border border-slate-300 bg-white text-slate-900'
      : 'bg-slate-100 text-slate-700';

  return <button type="button" onClick={onClick} className={`w-full rounded-2xl px-4 py-3 text-base font-bold transition ${className}`}>{children}</button>;
}

function Header({ title, subtitle, step }: { title: string; subtitle?: string; step?: string }) {
  return (
    <header className="mb-4">
      {step && <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">{step}</div>}
      <h1 className="text-xl font-extrabold leading-tight text-slate-950">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>}
    </header>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('learner');
  const [step, setStep] = useState<LearnerStep>('entry');
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [sessionCode, setSessionCode] = useState('JKD-2026-01');

  if (mode === 'instructor') {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
        <Header step="Instructor" title="강사용 대시보드" subtitle="평가가 아니라 수업 운영과 토의 지원을 위한 화면입니다." />
        <div className="grid gap-4 md:grid-cols-3">
          <Card><div className="text-sm font-bold text-slate-500">세션 코드</div><div className="mt-2 text-2xl font-extrabold">{sessionCode}</div></Card>
          <Card><div className="text-sm font-bold text-slate-500">저장 연동</div><div className="mt-2 text-2xl font-extrabold">준비 중</div></Card>
          <Card><div className="text-sm font-bold text-slate-500">대시보드 성격</div><div className="mt-2 text-lg font-extrabold">토의 지원</div></Card>
        </div>
        <div className="mt-4 max-w-xs"><Button variant="secondary" onClick={() => setMode('learner')}>교육생 화면으로 돌아가기</Button></div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-8 pb-24">
      {step === 'entry' && (
        <>
          <Header title="종근당 영업팀장 AI 리더십 Lab Journey" subtitle="교육 참여를 위해 아래 정보를 입력해 주세요." />
          <Card>
            <div className="space-y-4">
              <label className="block"><div className="mb-2 text-sm font-bold">이름</div><input className="w-full rounded-2xl border border-slate-300 px-4 py-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 한지훈" /></label>
              <label className="block"><div className="mb-2 text-sm font-bold">조/팀</div><input className="w-full rounded-2xl border border-slate-300 px-4 py-3" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="예: 3조" /></label>
              <label className="block"><div className="mb-2 text-sm font-bold">세션 코드</div><input className="w-full rounded-2xl border border-slate-300 px-4 py-3" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} /></label>
              <Button onClick={() => setStep('intro')}>입장하기</Button>
            </div>
          </Card>
        </>
      )}

      {step === 'intro' && (
        <>
          <Header title="오늘의 실습 방식" />
          <Card>
            <div className="space-y-4">
              <p className="font-bold leading-7">이 웹앱에서는 AI가 답을 대신 내리지 않습니다.</p>
              <p className="text-sm leading-6 text-slate-700">1. 먼저 내 판단을 적습니다.<br />2. AI에게 물어볼 질문을 만듭니다.<br />3. AI 답변을 우리 팀에 맞게 고쳐 실행안으로 저장합니다.</p>
              <div className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{complianceWarning}</div>
              <Button onClick={() => setStep('home')}>시작하기</Button>
            </div>
          </Card>
        </>
      )}

      {step === 'home' && (
        <>
          <Header title={`${name || '참여자'}님, 오늘의 여정입니다`} subtitle="M1~M4를 진행하며 Full Lab과 Lite Lab을 선택합니다." />
          <div className="space-y-3">
            {['M1 AI 기본기', 'M2 성과관리', 'M3 업무관리', 'M4 사람관리', 'Review / Wrap-up'].map((label) => <Card key={label}><div className="font-extrabold">{label}</div><p className="mt-2 text-sm leading-6 text-slate-600">기능 구현을 위한 기본 골격이 연결되었습니다.</p><div className="mt-4"><Button variant="secondary">다음 단계에서 구현</Button></div></Card>)}
            <Button variant="ghost" onClick={() => setMode('instructor')}>강사용 대시보드</Button>
          </div>
        </>
      )}
    </main>
  );
}
