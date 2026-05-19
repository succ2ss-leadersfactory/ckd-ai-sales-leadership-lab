import { useEffect, useState } from 'react';
import { Button, Card, Header, Save } from './components/common';
import { FullLabV2 } from './components/FullLabV2';
import { LiteLab } from './components/LiteLab';
import { scenarios, type Scenario, type SaveStatus } from './data/m2Data';

type Step = 'entry' | 'home' | 'select' | 'fullV2' | 'liteLab' | 'dashboard';

type Participant = {
  participantId: string;
  name: string;
  groupName: string;
  sessionCode: string;
  courseId: string;
};

const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_WEBAPP_URL as string | undefined;
const courseId = 'jongkundang-sales-ai-lab';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function callAppsScript(action: string, payload: unknown) {
  if (!API_URL) return { skipped: true };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });

  const json = await response.json();
  if (!json.success) throw new Error(json.message || 'API error');
  return json.data;
}

function EntryScreen({ participant, setParticipant, onEnter, error, status }: { participant: Participant; setParticipant: (value: Participant) => void; onEnter: () => void; error: string; status: SaveStatus }) {
  return (
    <>
      <Header title="종근당 영업팀장 AI 리더십 Lab Journey" subtitle="교육 참여를 위해 정보를 입력해 주세요." />
      <Card>
        <div className="space-y-3">
          <input className="w-full rounded-2xl border border-slate-300 p-3" placeholder="이름" value={participant.name} onChange={(event) => setParticipant({ ...participant, name: event.target.value })} />
          <input className="w-full rounded-2xl border border-slate-300 p-3" placeholder="조/팀" value={participant.groupName} onChange={(event) => setParticipant({ ...participant, groupName: event.target.value })} />
          <input className="w-full rounded-2xl border border-slate-300 p-3" value={participant.sessionCode} onChange={(event) => setParticipant({ ...participant, sessionCode: event.target.value })} />
          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Save status={status} />
          <Button onClick={onEnter}>입장하기</Button>
        </div>
      </Card>
    </>
  );
}

function HomeScreen({ participant, onStart, onDashboard }: { participant: Participant; onStart: () => void; onDashboard: () => void }) {
  return (
    <>
      <Header title={`${participant.name || '참여자'}님, 오늘의 여정입니다`} subtitle="M2-5 Full Lab v2와 Lite Lab 저장 흐름이 연결되었습니다." />
      <div className="space-y-3">
        <Card>
          <h2 className="font-bold">M2 성과관리</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">성과 개선 면담 Full Lab v2를 진행한 뒤 Lite Lab으로 이어집니다.</p>
          <div className="mt-4"><Button onClick={onStart}>M2 Full/Lite 선택하기</Button></div>
        </Card>
        <Button variant="ghost" onClick={onDashboard}>강사용 대시보드</Button>
      </div>
    </>
  );
}

function SelectScreen({ selectedFull, selectedLite, setSelectedFull, setSelectedLite, onSave, onHome }: { selectedFull: string; selectedLite: string; setSelectedFull: (value: string) => void; setSelectedLite: (value: string) => void; onSave: () => void; onHome: () => void }) {
  return (
    <>
      <Header step="M2 Lab 선택" title="성과관리 상황 선택" subtitle="Full Lab과 Lite Lab을 선택합니다." />
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className={selectedFull === scenario.id || selectedLite === scenario.id ? 'ring-1 ring-slate-900' : ''}>
            <div className="mb-2 flex gap-2 text-xs font-bold">
              {scenario.recommendedFull && <span className="rounded-full bg-slate-900 px-2 py-1 text-white">추천 Full</span>}
              {scenario.recommendedLite && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">추천 Lite</span>}
            </div>
            <h2 className="font-bold">{scenario.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{scenario.summary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant={selectedFull === scenario.id ? 'primary' : 'secondary'} onClick={() => { setSelectedFull(scenario.id); if (selectedLite === scenario.id) setSelectedLite(''); }}>Full</Button>
              <Button variant={selectedLite === scenario.id ? 'primary' : 'secondary'} onClick={() => { if (selectedFull !== scenario.id) setSelectedLite(scenario.id); }}>Lite</Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 bg-white p-4">
        <Button variant="secondary" onClick={onHome}>홈</Button>
        <Button disabled={!selectedFull || !selectedLite} onClick={onSave}>선택 저장 후 Full Lab 시작</Button>
      </div>
    </>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>('entry');
  const [participant, setParticipant] = useState<Participant>(() => getStored('p', { participantId: '', name: '', groupName: '', sessionCode: 'JKD-2026-01', courseId }));
  const [selectedFull, setSelectedFull] = useState('M2-5');
  const [selectedLite, setSelectedLite] = useState('M2-2');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<unknown>(null);
  const fullScenario: Scenario = scenarios.find((item) => item.id === selectedFull) || scenarios[2];
  const liteScenario: Scenario = scenarios.find((item) => item.id === selectedLite) || scenarios[1];

  useEffect(() => {
    localStorage.setItem('p', JSON.stringify(participant));
  }, [participant]);

  async function saveParticipant() {
    setError('');
    if (!participant.name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }

    const next = { ...participant, participantId: participant.participantId || createId('P'), courseId };
    setParticipant(next);
    setStatus('saving');

    try {
      await callAppsScript('saveParticipant', { ...next, role: 'learner', entryStatus: 'active' });
      setStatus('saved');
    } catch {
      setStatus('failed');
    }

    setStep('home');
  }

  async function saveSelection() {
    setStatus('saving');
    try {
      await callAppsScript('saveProgress', {
        participantId: participant.participantId,
        sessionCode: participant.sessionCode,
        courseId,
        moduleId: 'M2',
        moduleTitle: '성과관리',
        status: 'in_progress',
        selectedFullScenarioId: selectedFull,
        selectedLiteScenarioIds: [selectedLite],
        completedFullCount: 0,
        completedLiteCount: 0,
        requiredFullCount: 1,
        requiredLiteCount: 1,
      });
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
    setStep('fullV2');
  }

  async function loadDashboard() {
    try {
      setDashboard(await callAppsScript('getDashboardData', { sessionCode: participant.sessionCode }));
    } catch (event) {
      setDashboard({ error: event instanceof Error ? event.message : '조회 오류' });
    }
  }

  if (step === 'dashboard') {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
        <Header step="Instructor" title="강사용 대시보드" subtitle="수업 운영과 토의 지원 화면입니다." />
        <div className="mb-4 flex max-w-xl gap-2">
          <Button onClick={loadDashboard}>대시보드 조회</Button>
          <Button variant="secondary" onClick={() => setStep('home')}>교육생 화면</Button>
        </div>
        <Card><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap text-xs">{dashboard ? JSON.stringify(dashboard, null, 2) : '아직 조회하지 않았습니다.'}</pre></Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-8 pb-28">
      {step === 'entry' && <EntryScreen participant={participant} setParticipant={setParticipant} onEnter={saveParticipant} error={error} status={status} />}
      {step === 'home' && <HomeScreen participant={participant} onStart={() => setStep('select')} onDashboard={() => setStep('dashboard')} />}
      {step === 'select' && <SelectScreen selectedFull={selectedFull} selectedLite={selectedLite} setSelectedFull={setSelectedFull} setSelectedLite={setSelectedLite} onSave={saveSelection} onHome={() => setStep('home')} />}
      {step === 'fullV2' && <FullLabV2 participant={participant} scenario={fullScenario} selectedLite={selectedLite} callAppsScript={callAppsScript} onBackToSelection={() => setStep('select')} onComplete={() => setStep('liteLab')} />}
      {step === 'liteLab' && <LiteLab participant={participant} scenario={liteScenario} selectedFull={selectedFull} callAppsScript={callAppsScript} onBackToHome={() => setStep('home')} onBackToSelection={() => setStep('select')} onComplete={() => setStep('home')} />}
    </main>
  );
}
