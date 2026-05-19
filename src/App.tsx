import { useEffect, useState } from 'react';
import { Button, Card, Header, Save } from './components/common';
import { FullLabV2 } from './components/FullLabV2';
import { LiteLab } from './components/LiteLab';
import {
  fixedFullScenarioId,
  recommendedLiteScenarioIds,
  requiredLiteCount,
  scenarios,
  type Scenario,
  type SaveStatus,
} from './data/m2Data';

type Step = 'entry' | 'home' | 'select' | 'fullV2' | 'liteLab' | 'dashboard';

interface Participant {
  participantId: string;
  name: string;
  groupName: string;
  sessionCode: string;
  courseId: string;
}

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

function toggleLiteSelection(list: string[], id: string) {
  if (list.includes(id)) return list.filter((item) => item !== id);
  if (list.length >= requiredLiteCount) return list;
  return [...list, id];
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

function HomeScreen({ participant, onStart, onContinueLite, onDashboard, canContinueLite, liteProgressLabel }: { participant: Participant; onStart: () => void; onContinueLite: () => void; onDashboard: () => void; canContinueLite: boolean; liteProgressLabel: string }) {
  return (
    <>
      <Header title={`${participant.name || '참여자'}님, 오늘의 여정입니다`} subtitle="고정 Full Lab 1개와 선택 Lite Lab 2개로 진행합니다." />
      <div className="space-y-3">
        <Card>
          <h2 className="font-bold">M2 성과관리</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">공통 핵심 상황은 Full Lab으로 깊게 다루고, 나머지 상황 중 2개를 Lite Lab으로 선택합니다.</p>
          <div className="mt-4 space-y-2">
            <Button onClick={onStart}>M2 Lab 시작하기</Button>
            {canContinueLite && <Button variant="secondary" onClick={onContinueLite}>진행 중 Lite Lab 이어하기 {liteProgressLabel}</Button>}
          </div>
        </Card>
        <Button variant="ghost" onClick={onDashboard}>강사용 대시보드</Button>
      </div>
    </>
  );
}

function SelectScreen({ selectedLiteIds, setSelectedLiteIds, onSave, onHome, error }: { selectedLiteIds: string[]; setSelectedLiteIds: (value: string[]) => void; onSave: () => void; onHome: () => void; error: string }) {
  const fixedFull = scenarios.find((scenario) => scenario.id === fixedFullScenarioId) || scenarios[0];
  const liteCandidates = scenarios.filter((scenario) => scenario.id !== fixedFullScenarioId);
  return (
    <>
      <Header step="M2 Lab 선택" title="성과관리 상황 선택" subtitle="Full Lab은 공통 핵심 상황으로 고정하고, Lite Lab 2개를 선택합니다." />
      <Card className="mb-4 bg-slate-50">
        <div className="mb-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">고정 Full Lab</div>
        <h2 className="font-bold">{fixedFull.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{fixedFull.summary}</p>
        <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-700">모든 참여자가 이 상황을 Full Lab으로 깊게 실습합니다.</p>
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setSelectedLiteIds(recommendedLiteScenarioIds.slice(0, requiredLiteCount))}>추천 Lite 2개 선택</Button>
        <Button variant="ghost" onClick={() => setSelectedLiteIds([])}>선택 초기화</Button>
      </div>
      <Card className="mb-4">
        <div className="text-sm font-bold text-slate-800">Lite Lab 선택 현황</div>
        <div className="mt-2 text-sm leading-6 text-slate-700">{selectedLiteIds.length}/{requiredLiteCount}개 선택됨</div>
        <div className="text-sm leading-6 text-slate-700">{selectedLiteIds.join(', ') || '아직 선택하지 않았습니다.'}</div>
      </Card>
      <div className="space-y-3">
        {liteCandidates.map((scenario) => {
          const selected = selectedLiteIds.includes(scenario.id);
          return (
            <Card key={scenario.id} className={selected ? 'ring-1 ring-slate-900' : ''}>
              <div className="mb-2 flex gap-2 text-xs font-bold">
                {scenario.recommendedLite && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">추천 Lite</span>}
                {selected && <span className="rounded-full bg-slate-900 px-2 py-1 text-white">Lite 선택됨</span>}
              </div>
              <h2 className="font-bold">{scenario.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{scenario.summary}</p>
              <div className="mt-3">
                <Button variant={selected ? 'primary' : 'secondary'} onClick={() => setSelectedLiteIds(toggleLiteSelection(selectedLiteIds, scenario.id))}>{selected ? 'Lite 선택 해제' : 'Lite로 선택'}</Button>
              </div>
            </Card>
          );
        })}
      </div>
      {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 bg-white p-4">
        <Button variant="secondary" onClick={onHome}>홈</Button>
        <Button disabled={selectedLiteIds.length !== requiredLiteCount} onClick={onSave}>선택 저장 후 Full Lab 시작</Button>
      </div>
    </>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>('entry');
  const [participant, setParticipant] = useState<Participant>(() => getStored('p', { participantId: '', name: '', groupName: '', sessionCode: 'JKD-2026-01', courseId }));
  const [selectedLiteIds, setSelectedLiteIds] = useState<string[]>(() => getStored('selectedLiteIds', recommendedLiteScenarioIds.slice(0, requiredLiteCount)));
  const [liteIndex, setLiteIndex] = useState(() => Number(localStorage.getItem('liteIndex') || '0'));
  const [selectionSaved, setSelectionSaved] = useState(() => localStorage.getItem('selectionSaved') === 'true');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<unknown>(null);
  const fullScenario: Scenario = scenarios.find((item) => item.id === fixedFullScenarioId) || scenarios[2];
  const safeLiteIndex = Math.min(liteIndex, Math.max(selectedLiteIds.length - 1, 0));
  const liteScenario: Scenario = scenarios.find((item) => item.id === selectedLiteIds[safeLiteIndex]) || scenarios[1];
  const hasNextLite = safeLiteIndex < selectedLiteIds.length - 1;
  const liteProgressLabel = selectedLiteIds.length > 0 ? `(${safeLiteIndex + 1}/${selectedLiteIds.length})` : '';

  useEffect(() => { localStorage.setItem('p', JSON.stringify(participant)); }, [participant]);
  useEffect(() => { localStorage.setItem('selectedLiteIds', JSON.stringify(selectedLiteIds)); }, [selectedLiteIds]);
  useEffect(() => { localStorage.setItem('liteIndex', String(liteIndex)); }, [liteIndex]);

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
    } catch { setStatus('failed'); }
    setStep('home');
  }

  async function saveSelection() {
    setError('');
    if (selectedLiteIds.length !== requiredLiteCount) {
      setError(`Lite Lab을 ${requiredLiteCount}개 선택해 주세요.`);
      return;
    }
    setStatus('saving');
    try {
      await callAppsScript('saveProgress', { participantId: participant.participantId, sessionCode: participant.sessionCode, courseId, moduleId: 'M2', moduleTitle: '성과관리', status: 'in_progress', selectedFullScenarioId: fixedFullScenarioId, selectedLiteScenarioIds: selectedLiteIds, completedFullCount: 0, completedLiteCount: 0, requiredFullCount: 1, requiredLiteCount });
      setStatus('saved');
    } catch { setStatus('failed'); }
    localStorage.setItem('selectionSaved', 'true');
    setSelectionSaved(true);
    setLiteIndex(0);
    setStep('fullV2');
  }

  async function loadDashboard() {
    try { setDashboard(await callAppsScript('getDashboardData', { sessionCode: participant.sessionCode })); }
    catch (event) { setDashboard({ error: event instanceof Error ? event.message : '조회 오류' }); }
  }

  function handleFullComplete() { setLiteIndex(0); setStep('liteLab'); }
  function handleLiteComplete() {
    if (hasNextLite) {
      setLiteIndex((prev) => prev + 1);
      setStep('liteLab');
      return;
    }
    localStorage.removeItem('liteIndex');
    setStep('home');
  }

  if (step === 'dashboard') {
    return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8"><Header step="Instructor" title="강사용 대시보드" subtitle="수업 운영과 토의 지원 화면입니다." /><div className="mb-4 flex max-w-xl gap-2"><Button onClick={loadDashboard}>대시보드 조회</Button><Button variant="secondary" onClick={() => setStep('home')}>교육생 화면</Button></div><Card><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap text-xs">{dashboard ? JSON.stringify(dashboard, null, 2) : '아직 조회하지 않았습니다.'}</pre></Card></main>;
  }

  return <main className="mx-auto min-h-screen max-w-xl px-4 py-8 pb-28">
    {step === 'entry' && <EntryScreen participant={participant} setParticipant={setParticipant} onEnter={saveParticipant} error={error} status={status} />}
    {step === 'home' && <HomeScreen participant={participant} onStart={() => setStep('select')} onContinueLite={() => setStep('liteLab')} onDashboard={() => setStep('dashboard')} canContinueLite={selectionSaved && selectedLiteIds.length > 0} liteProgressLabel={liteProgressLabel} />}
    {step === 'select' && <SelectScreen selectedLiteIds={selectedLiteIds} setSelectedLiteIds={setSelectedLiteIds} onSave={saveSelection} onHome={() => setStep('home')} error={error} />}
    {step === 'fullV2' && <FullLabV2 participant={participant} scenario={fullScenario} selectedLite={selectedLiteIds.join('; ')} callAppsScript={callAppsScript} onBackToSelection={() => setStep('select')} onComplete={handleFullComplete} />}
    {step === 'liteLab' && <LiteLab key={liteScenario.id} participant={participant} scenario={liteScenario} selectedFull={fixedFullScenarioId} callAppsScript={callAppsScript} onBackToHome={() => setStep('home')} onBackToSelection={() => setStep('select')} onComplete={handleLiteComplete} hasNextLite={hasNextLite} />}
  </main>;
}