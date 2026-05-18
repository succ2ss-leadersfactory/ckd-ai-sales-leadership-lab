import { useEffect, useState, type ReactNode } from 'react';

type Mode = 'learner' | 'instructor';
type LearnerStep = 'entry' | 'intro' | 'home' | 'm1' | 'select';
type SaveStatus = 'idle' | 'draft_saved' | 'saving' | 'saved' | 'save_failed';
type M1InputType = 'multiSelect' | 'singleSelect' | 'text' | 'structuredPrompt' | 'checklist';
type ModuleId = 'M2' | 'M3' | 'M4';

interface Participant {
  participantId: string;
  name: string;
  groupName: string;
  sessionCode: string;
  courseId: string;
}

interface M1Field {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
}

interface M1Screen {
  screenId: string;
  title: string;
  purposeText: string;
  inputType: M1InputType;
  saveKey: string;
  options?: string[];
  fields?: M1Field[];
  helperText?: string;
}

interface Scenario {
  id: string;
  moduleId: ModuleId;
  title: string;
  summary: string;
  outputTitle: string;
  recommendedFull?: boolean;
  recommendedLite?: boolean;
  complianceLevel?: 'normal' | 'high';
}

type M1Answers = Record<string, unknown>;

type LabSelections = Record<string, { fullScenarioId: string; liteScenarioIds: string[] }>;

const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_WEBAPP_URL as string | undefined;
const courseId = 'jongkundang-sales-ai-lab';
const complianceWarning = '고객명, 병원명, 의사명, 내부 전략, 민감한 수치, 승인되지 않은 제품 표현은 입력하지 마세요.';

const moduleTitles: Record<ModuleId, string> = {
  M2: '성과관리',
  M3: '업무관리',
  M4: '사람관리',
};

const moduleCoreQuestions: Record<ModuleId, string> = {
  M2: '왜 성과 차이가 발생했으며, 다음 행동을 어떻게 바꿔야 하는가?',
  M3: '무엇을 먼저 하고, 누가 맡고, 어떻게 점검하고, 어떻게 보고할 것인가?',
  M4: '이 팀원이 성과를 내고 성장하기 위해 지금 어떤 대화, 지원, 경험이 필요한가?',
};

const scenarioMap: Record<ModuleId, Scenario[]> = {
  M2: [
    { id: 'M2-1', moduleId: 'M2', title: '목표는 올라갔는데 팀원들은 납득하지 못합니다', summary: '본부에서 목표가 올라왔지만 팀원들은 현장 상황과 맞지 않는다고 느끼는 상황입니다.', outputTitle: '팀 미팅 목표 설명 준비' },
    { id: 'M2-2', moduleId: 'M2', title: '활동은 많은데 성과로 연결되지 않습니다', summary: '방문 건수와 기록은 충분하지만 핵심 제품 성과로 이어지지 않는 상황입니다.', outputTitle: '이번 주 성과개선 계획', recommendedLite: true },
    { id: 'M2-3', moduleId: 'M2', title: '같은 제품인데 담당자별 성과 차이가 큽니다', summary: '같은 전략 제품을 담당하지만 팀원별 성과 차이가 큰 상황입니다.', outputTitle: '팀원별 성과 차이 확인' },
    { id: 'M2-4', moduleId: 'M2', title: '월말에 가서야 성과 위험이 보입니다', summary: '월말이 가까워져서야 성과 위험이 한꺼번에 드러나는 상황입니다.', outputTitle: '월말 전 성과위험 확인' },
    { id: 'M2-5', moduleId: 'M2', title: '성과 개선 면담이 압박처럼 받아들여집니다', summary: '성과가 흔들리는 팀원이 면담을 실적 압박으로 받아들이는 상황입니다.', outputTitle: '성과 1:1 면담 준비', recommendedFull: true },
  ],
  M3: [
    { id: 'M3-1', moduleId: 'M3', title: '본부 요청과 현장 일정이 동시에 몰렸습니다', summary: '본부 요청 자료와 현장 일정, 팀원 점검 업무가 한 주에 동시에 몰린 상황입니다.', outputTitle: '이번 주 우선순위 정리', recommendedLite: true },
    { id: 'M3-2', moduleId: 'M3', title: '중요한 일이 계속 같은 사람에게 몰립니다', summary: '중요하고 어려운 일이 계속 한 명의 고성과자에게 집중되는 상황입니다.', outputTitle: '업무 나누기 계획' },
    { id: 'M3-3', moduleId: 'M3', title: '월요일에 정한 계획이 금요일마다 흐트러집니다', summary: '월요일 계획은 세우지만 금요일이 되면 실행이 달라져 있는 상황입니다.', outputTitle: '이번 주 진행상황 확인' },
    { id: 'M3-4', moduleId: 'M3', title: '회의는 많은데 결정과 실행이 남지 않습니다', summary: '회의는 자주 하지만 끝난 뒤 누가 무엇을 할지 남지 않는 상황입니다.', outputTitle: '회의 결정사항 정리' },
    { id: 'M3-5', moduleId: 'M3', title: '보고는 해야 하는데 정리가 안 됩니다', summary: '본부 보고 요청은 왔지만, 현장 정보가 흩어져 한 장으로 정리되지 않는 상황입니다.', outputTitle: '본부 보고용 1페이지 정리', recommendedFull: true, complianceLevel: 'high' },
  ],
  M4: [
    { id: 'M4-1', moduleId: 'M4', title: '피드백 이후 팀원이 말수가 줄었습니다', summary: '피드백 이후 팀원이 회의와 동행 방문에서 말을 아끼는 상황입니다.', outputTitle: '다시 이야기 나누기 준비', recommendedFull: true },
    { id: 'M4-2', moduleId: 'M4', title: '성과는 좋지만 팀 안에서는 혼자 일합니다', summary: '성과는 좋지만 후배 지원과 정보 공유에는 소극적인 팀원이 있는 상황입니다.', outputTitle: '팀 기여 요청 준비' },
    { id: 'M4-3', moduleId: 'M4', title: '신입이 고객 앞에서 얼어붙었습니다', summary: '신입이 고객 앞에서 준비한 메시지를 제대로 말하지 못한 상황입니다.', outputTitle: '다음 동행 방문 역할 정하기', recommendedLite: true },
    { id: 'M4-4', moduleId: 'M4', title: '중견 팀원이 요즘 의욕이 없어 보입니다', summary: '성과가 크게 나쁘지는 않지만 최근 말이 줄고 의욕이 낮아 보이는 중견 팀원이 있는 상황입니다.', outputTitle: '요즘 상태를 묻는 1:1 준비' },
    { id: 'M4-5', moduleId: 'M4', title: '팀원 간 정보 공유가 끊겼습니다', summary: '팀원들이 고객 반응과 현장 정보를 예전만큼 공유하지 않는 상황입니다.', outputTitle: '팀에서 나눌 정보 정하기', complianceLevel: 'high' },
  ],
};

const m1Screens: M1Screen[] = [
  {
    screenId: 'M1-1',
    title: '요즘 영업팀장의 일이 왜 복잡해졌을까요?',
    purposeText: '요즘 팀장 업무 중 AI로 줄이고 싶은 부담을 먼저 골라봅니다.',
    inputType: 'multiSelect',
    saveKey: 'aiReductionNeed',
    options: [
      '본부 요청과 현장 일정이 동시에 몰린다.',
      '팀원별 성과 차이를 어떻게 봐야 할지 어렵다.',
      '성과 면담을 하려면 말이 조심스럽다.',
      '보고자료를 만들다 보면 시간이 너무 많이 든다.',
      '팀원별 코칭 질문을 준비하기 어렵다.',
      '회의는 하는데 실행이 잘 남지 않는다.',
      '신입과 고성과자를 다르게 관리하기 어렵다.',
    ],
  },
  {
    screenId: 'M1-2',
    title: 'AI가 팀장 일을 어떻게 도와줄 수 있을까요?',
    purposeText: 'AI가 대신 판단하는 것이 아니라 정리와 준비를 도울 수 있는 영역입니다.',
    inputType: 'multiSelect',
    saveKey: 'aiSupportArea',
    options: ['자료 정리', '분석 보조', '회의 준비', '보고 준비', '코칭 질문 준비', '실행계획 구체화', '표현 다듬기'],
  },
  {
    screenId: 'M1-3',
    title: '영업팀장의 역할은 어떻게 달라질까요?',
    purposeText: 'AI 시대의 팀장 역할을 내 업무와 연결해 봅니다.',
    inputType: 'singleSelect',
    saveKey: 'desiredRoleShift',
    options: [
      '지시하는 사람 → 생각을 정리해주는 사람',
      '보고를 기다리는 사람 → 실행을 맞춰주는 사람',
      '실적을 압박하는 사람 → 성과 원인을 함께 찾는 사람',
      '회의를 진행하는 사람 → 회의 후 실행을 남기는 사람',
      '피드백을 주는 사람 → 성장 질문을 준비하는 사람',
      '혼자 보고서를 쓰는 사람 → 핵심 판단을 빠르게 정리하는 사람',
    ],
  },
  {
    screenId: 'M1-4',
    title: '영업에서 AI를 쓸 때 지켜야 할 기준',
    purposeText: 'AI에 넣기 전 실제 정보는 비식별 표현으로 바꿔야 합니다.',
    inputType: 'text',
    saveKey: 'maskedInfoPractice',
    helperText: '예: 서울 ○○병원 김○○ 교수님 → 한 핵심 고객',
    fields: [{ key: 'maskedText', label: '아래 문장을 비식별 표현으로 바꿔보세요.', placeholder: '한 핵심 고객이 자사 제품 메시지에 신중한 반응을 보이고 있습니다.', required: false }],
  },
  {
    screenId: 'M1-5',
    title: '좋은 질문의 기본 구조 익히기',
    purposeText: '좋은 질문은 길이가 아니라 구조가 중요합니다.',
    inputType: 'structuredPrompt',
    saveKey: 'promptPractice',
    fields: [
      { key: 'context', label: '상황', placeholder: '어떤 일이 벌어졌나요?', required: true },
      { key: 'role', label: '역할', placeholder: 'AI에게 어떤 역할을 맡길까요?', required: true },
      { key: 'task', label: '요청', placeholder: '무엇을 만들어 달라고 할까요?', required: true },
      { key: 'format', label: '형식', placeholder: '어떤 형태로 정리할까요?', required: true },
      { key: 'conditions', label: '조건', placeholder: '반드시 지켜야 할 기준은 무엇인가요?', required: true },
    ],
  },
  {
    screenId: 'M1-6',
    title: 'AI 답변을 그대로 쓰지 않기',
    purposeText: 'AI 답변을 받은 뒤 무엇을 고쳐야 할지 기준을 정합니다.',
    inputType: 'checklist',
    saveKey: 'revisionCriteria',
    options: ['우리 팀 현실과 맞는가?', '너무 일반적인 말은 아닌가?', '팀원에게 차갑게 들릴 표현은 없는가?', '고객명, 병원명, 내부 정보가 들어가 있지는 않은가?', '제품이나 경쟁사 관련 표현이 과도하지 않은가?', '내가 실제로 실행할 수 있는 행동인가?'],
  },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function callAppsScript(action: string, payload: unknown) {
  if (!API_URL) return { skipped: true };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });

  const json = await response.json();
  if (!json.success) throw new Error(json.message || '저장 실패');
  return json.data;
}

function getArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function isM1ScreenValid(screen: M1Screen, answers: M1Answers) {
  const value = answers[screen.saveKey];
  if (screen.inputType === 'multiSelect' || screen.inputType === 'checklist') return getArray(value).length > 0;
  if (screen.inputType === 'singleSelect') return Boolean(getString(value));
  if (screen.inputType === 'structuredPrompt') {
    const structured = (value || {}) as Record<string, string>;
    return (screen.fields || []).filter((field) => field.required).every((field) => Boolean(structured[field.key]?.trim()));
  }
  return true;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function Button({ children, onClick, variant = 'primary', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean }) {
  const className = variant === 'primary'
    ? 'bg-slate-900 text-white'
    : variant === 'secondary'
      ? 'border border-slate-300 bg-white text-slate-900'
      : 'bg-slate-100 text-slate-700';

  return <button type="button" disabled={disabled} onClick={onClick} className={`w-full rounded-2xl px-4 py-3 text-base font-bold transition disabled:opacity-50 ${className}`}>{children}</button>;
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

function SaveMessage({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const message = {
    draft_saved: '작성 중인 내용이 이 기기에 임시 저장되었습니다.',
    saving: '저장 중입니다. 잠시만 기다려 주세요.',
    saved: '저장되었습니다. 나중에 내 저장 내용 보기에서 다시 확인할 수 있습니다.',
    save_failed: '저장이 지연되고 있습니다. 입력하신 내용은 화면에 그대로 남아 있습니다.',
  }[status];
  return <div className="rounded-2xl bg-slate-100 p-3 text-sm leading-6 text-slate-700">{message}</div>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-800">{label}</div>
      <textarea className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 leading-6 outline-none focus:border-slate-900" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectCard({ title, selected, onClick, description }: { title: string; selected: boolean; onClick: () => void; description?: string }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left font-bold transition ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}><div>{title}</div>{description && <div className={`mt-1 text-sm leading-6 ${selected ? 'text-slate-200' : 'text-slate-600'}`}>{description}</div>}</button>;
}

function Badge({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'blue' | 'amber' }) {
  const className = tone === 'dark' ? 'bg-slate-900 text-white' : tone === 'blue' ? 'border border-blue-100 bg-blue-50 text-blue-700' : 'border border-amber-100 bg-amber-50 text-amber-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function M1Input({ screen, value, onChange }: { screen: M1Screen; value: unknown; onChange: (value: unknown) => void }) {
  if (screen.inputType === 'multiSelect' || screen.inputType === 'checklist') {
    const selected = getArray(value);
    return <div className="space-y-3">{screen.options?.map((option) => <SelectCard key={option} title={option} selected={selected.includes(option)} onClick={() => onChange(toggleValue(selected, option))} />)}</div>;
  }

  if (screen.inputType === 'singleSelect') {
    const selected = getString(value);
    return <div className="space-y-3">{screen.options?.map((option) => <SelectCard key={option} title={option} selected={selected === option} onClick={() => onChange(option)} />)}</div>;
  }

  if (screen.inputType === 'structuredPrompt') {
    const structured = (value || {}) as Record<string, string>;
    return (
      <div className="space-y-4">
        {screen.fields?.map((field) => (
          <label key={field.key} className="block">
            <div className="mb-2 text-sm font-bold text-slate-800">{field.label}</div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" value={structured[field.key] || ''} placeholder={field.placeholder} onChange={(event) => onChange({ ...structured, [field.key]: event.target.value })} />
          </label>
        ))}
        <Card className="bg-slate-50">
          <div className="mb-2 text-sm font-bold text-slate-700">질문 미리보기</div>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{`상황:\n${structured.context || ''}\n\n역할:\n${structured.role || ''}\n\n요청:\n${structured.task || ''}\n\n형식:\n${structured.format || ''}\n\n조건:\n${structured.conditions || ''}`}</pre>
        </Card>
      </div>
    );
  }

  const field = screen.fields?.[0];
  return <TextArea label={field?.label || '입력'} value={getString(value)} placeholder={field?.placeholder} onChange={onChange as (value: string) => void} />;
}

function getStoredParticipant(): Participant {
  const saved = localStorage.getItem('ckd_participant');
  if (saved) return JSON.parse(saved) as Participant;
  return { participantId: '', name: '', groupName: '', sessionCode: 'JKD-2026-01', courseId };
}

function getStoredM1Answers(): M1Answers {
  const saved = localStorage.getItem('ckd_m1_answers');
  if (!saved) return {};
  try {
    return JSON.parse(saved) as M1Answers;
  } catch {
    return {};
  }
}

function getStoredSelections(): LabSelections {
  const saved = localStorage.getItem('ckd_lab_selections');
  if (!saved) return {};
  try {
    return JSON.parse(saved) as LabSelections;
  } catch {
    return {};
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>('learner');
  const [step, setStep] = useState<LearnerStep>('entry');
  const [participant, setParticipant] = useState<Participant>(() => getStoredParticipant());
  const [m1Index, setM1Index] = useState(0);
  const [m1Answers, setM1Answers] = useState<M1Answers>(() => getStoredM1Answers());
  const [activeModule, setActiveModule] = useState<ModuleId>('M2');
  const [labSelections, setLabSelections] = useState<LabSelections>(() => getStoredSelections());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<unknown>(null);

  const currentM1 = m1Screens[m1Index];
  const progress = Math.round(((m1Index + 1) / m1Screens.length) * 100);
  const currentSelection = labSelections[activeModule] || { fullScenarioId: '', liteScenarioIds: [] };

  useEffect(() => {
    localStorage.setItem('ckd_participant', JSON.stringify(participant));
  }, [participant]);

  useEffect(() => {
    localStorage.setItem('ckd_m1_answers', JSON.stringify(m1Answers));
    if (Object.keys(m1Answers).length > 0 && saveStatus !== 'saving' && saveStatus !== 'saved') setSaveStatus('draft_saved');
  }, [m1Answers, saveStatus]);

  useEffect(() => {
    localStorage.setItem('ckd_lab_selections', JSON.stringify(labSelections));
  }, [labSelections]);

  async function handleEnter() {
    setError('');
    if (!participant.name.trim()) return setError('이름을 입력해 주세요.');
    if (!participant.groupName.trim()) return setError('조/팀을 입력해 주세요.');
    if (!participant.sessionCode.trim()) return setError('세션 코드를 입력해 주세요.');

    const next = { ...participant, participantId: participant.participantId || createId('P'), courseId };
    setParticipant(next);
    setSaveStatus('saving');

    try {
      await callAppsScript('saveParticipant', { ...next, role: 'learner', entryStatus: 'active', lastScreen: 'L-001', deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop', userAgent: navigator.userAgent });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('save_failed');
    }
    setStep('intro');
  }

  function updateM1Answer(value: unknown) {
    setM1Answers((prev) => ({ ...prev, [currentM1.saveKey]: value }));
  }

  async function saveM1() {
    setError('');
    if (!isM1ScreenValid(currentM1, m1Answers)) return setError('이 단계에서 필요한 내용을 선택하거나 입력해 주세요.');
    setSaveStatus('saving');

    try {
      await callAppsScript('saveResponse', { participantId: participant.participantId, sessionCode: participant.sessionCode, courseId, name: participant.name, groupName: participant.groupName, moduleId: 'M1', moduleTitle: 'AI와 함께 일하는 영업팀장의 기본기', labType: 'readiness', aiReductionNeed: m1Answers.aiReductionNeed, aiSupportArea: m1Answers.aiSupportArea, desiredRoleShift: m1Answers.desiredRoleShift, maskedInfoPractice: m1Answers.maskedInfoPractice, promptPractice: m1Answers.promptPractice, revisionCriteria: m1Answers.revisionCriteria });
      await callAppsScript('saveProgress', { participantId: participant.participantId, sessionCode: participant.sessionCode, courseId, moduleId: 'M1', moduleTitle: 'AI와 함께 일하는 영업팀장의 기본기', status: 'completed', requiredFullCount: 0, requiredLiteCount: 0, completedFullCount: 0, completedLiteCount: 0, lastLabType: 'readiness', lastStep: 'M1-6' });
      setSaveStatus('saved');
      setStep('home');
    } catch {
      setSaveStatus('save_failed');
      setError('저장이 지연되고 있습니다. 입력하신 내용은 화면에 그대로 남아 있습니다. 잠시 후 다시 저장해 주세요.');
    }
  }

  function nextM1() {
    setError('');
    if (!isM1ScreenValid(currentM1, m1Answers)) return setError('이 단계에서 필요한 내용을 선택하거나 입력해 주세요.');
    if (m1Index === m1Screens.length - 1) void saveM1();
    else setM1Index((prev) => prev + 1);
  }

  function updateLabSelection(next: { fullScenarioId?: string; liteScenarioIds?: string[] }) {
    setLabSelections((prev) => ({
      ...prev,
      [activeModule]: {
        fullScenarioId: next.fullScenarioId ?? currentSelection.fullScenarioId,
        liteScenarioIds: next.liteScenarioIds ?? currentSelection.liteScenarioIds,
      },
    }));
    setSaveStatus('draft_saved');
  }

  function selectRecommended() {
    const full = scenarioMap[activeModule].find((scenario) => scenario.recommendedFull) || scenarioMap[activeModule][0];
    const lite = scenarioMap[activeModule].find((scenario) => scenario.recommendedLite) || scenarioMap[activeModule].find((scenario) => scenario.id !== full.id) || scenarioMap[activeModule][1];
    updateLabSelection({ fullScenarioId: full.id, liteScenarioIds: [lite.id] });
    setError('');
  }

  function selectFull(id: string) {
    const nextLite = currentSelection.liteScenarioIds.filter((liteId) => liteId !== id);
    updateLabSelection({ fullScenarioId: id, liteScenarioIds: nextLite });
    setError('');
  }

  function toggleLite(id: string) {
    if (id === currentSelection.fullScenarioId) {
      setError('같은 상황을 Full Lab과 Lite Lab으로 동시에 선택할 수 없습니다.');
      return;
    }
    const current = currentSelection.liteScenarioIds;
    const next = current.includes(id) ? current.filter((liteId) => liteId !== id) : [id];
    updateLabSelection({ liteScenarioIds: next });
    setError('');
  }

  async function saveSelection() {
    setError('');
    if (!currentSelection.fullScenarioId) return setError('Full Lab으로 진행할 상황을 1개 선택해 주세요.');
    if (currentSelection.liteScenarioIds.length < 1) return setError('Lite Lab으로 진행할 상황을 1개 이상 선택해 주세요.');
    if (currentSelection.liteScenarioIds.includes(currentSelection.fullScenarioId)) return setError('같은 상황을 Full Lab과 Lite Lab으로 동시에 선택할 수 없습니다.');

    setSaveStatus('saving');
    try {
      await callAppsScript('saveProgress', {
        participantId: participant.participantId,
        sessionCode: participant.sessionCode,
        courseId,
        moduleId: activeModule,
        moduleTitle: moduleTitles[activeModule],
        status: 'in_progress',
        selectedFullScenarioId: currentSelection.fullScenarioId,
        selectedLiteScenarioIds: currentSelection.liteScenarioIds,
        completedFullCount: 0,
        completedLiteCount: 0,
        requiredFullCount: 1,
        requiredLiteCount: 1,
        lastScenarioId: currentSelection.fullScenarioId,
        lastLabType: 'full',
        lastStep: 'L-F01',
      });
      setSaveStatus('saved');
      setError('선택이 저장되었습니다. 다음 단계에서 Full Lab 화면을 연결합니다.');
    } catch {
      setSaveStatus('save_failed');
      setError('선택 저장이 지연되고 있습니다. 선택 내용은 이 기기에 임시 저장되어 있습니다.');
    }
  }

  async function loadDashboard() {
    setSaveStatus('saving');
    try {
      const data = await callAppsScript('getDashboardData', { sessionCode: participant.sessionCode || 'JKD-2026-01' });
      setDashboard(data);
      setSaveStatus('saved');
    } catch (err) {
      setDashboard({ error: err instanceof Error ? err.message : '조회 오류' });
      setSaveStatus('save_failed');
    }
  }

  if (mode === 'instructor') {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
        <Header step="Instructor" title="강사용 대시보드" subtitle="평가가 아니라 수업 운영과 토의 지원을 위한 화면입니다." />
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <Card><div className="text-sm font-bold text-slate-500">세션 코드</div><div className="mt-2 text-2xl font-extrabold">{participant.sessionCode}</div></Card>
          <Card><div className="text-sm font-bold text-slate-500">저장 연동</div><div className="mt-2 text-2xl font-extrabold">{API_URL ? '연결 가능' : '환경변수 필요'}</div></Card>
          <Card><div className="text-sm font-bold text-slate-500">대시보드 성격</div><div className="mt-2 text-lg font-extrabold">토의 지원</div></Card>
        </div>
        <div className="mb-4 flex max-w-xl gap-2"><Button onClick={loadDashboard}>대시보드 조회</Button><Button variant="secondary" onClick={() => setMode('learner')}>교육생 화면</Button></div>
        <SaveMessage status={saveStatus} />
        <Card className="mt-4"><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap text-xs leading-5">{dashboard ? JSON.stringify(dashboard, null, 2) : '아직 조회하지 않았습니다.'}</pre></Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-8 pb-28">
      {step === 'entry' && (
        <>
          <Header title="종근당 영업팀장 AI 리더십 Lab Journey" subtitle="교육 참여를 위해 아래 정보를 입력해 주세요." />
          <Card>
            <div className="space-y-4">
              <label className="block"><div className="mb-2 text-sm font-bold">이름</div><input className="w-full rounded-2xl border border-slate-300 px-4 py-3" value={participant.name} onChange={(event) => setParticipant({ ...participant, name: event.target.value })} placeholder="예: 한지훈" /></label>
              <label className="block"><div className="mb-2 text-sm font-bold">조/팀</div><input className="w-full rounded-2xl border border-slate-300 px-4 py-3" value={participant.groupName} onChange={(event) => setParticipant({ ...participant, groupName: event.target.value })} placeholder="예: 3조" /></label>
              <label className="block"><div className="mb-2 text-sm font-bold">세션 코드</div><input className="w-full rounded-2xl border border-slate-300 px-4 py-3" value={participant.sessionCode} onChange={(event) => setParticipant({ ...participant, sessionCode: event.target.value })} /></label>
              {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <SaveMessage status={saveStatus} />
              <Button onClick={handleEnter}>입장하기</Button>
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
          <Header title={`${participant.name || '참여자'}님, 오늘의 여정입니다`} subtitle="M1 기본기와 M2~M4 Full/Lite 선택 화면이 연결되었습니다." />
          <div className="space-y-3">
            <Card><div className="font-extrabold">M1 AI 기본기</div><p className="mt-2 text-sm leading-6 text-slate-600">AI 활용 원칙과 안전 기준을 6단계로 확인합니다.</p><div className="mt-4"><Button onClick={() => { setM1Index(0); setStep('m1'); }}>M1 시작하기</Button></div></Card>
            {(['M2', 'M3', 'M4'] as ModuleId[]).map((moduleId) => <Card key={moduleId}><div className="font-extrabold">{moduleId} {moduleTitles[moduleId]}</div><p className="mt-2 text-sm leading-6 text-slate-600">Full Lab 1개와 Lite Lab 1개를 선택합니다.</p><div className="mt-4"><Button variant="secondary" onClick={() => { setActiveModule(moduleId); setStep('select'); }}>{moduleId} Full/Lite 선택하기</Button></div></Card>)}
            <Card><div className="font-extrabold">Review / Wrap-up</div><p className="mt-2 text-sm leading-6 text-slate-600">다음 단계에서 저장 내용 보기와 마무리 제출을 연결합니다.</p><div className="mt-4"><Button variant="secondary">다음 단계에서 구현</Button></div></Card>
            <Button variant="ghost" onClick={() => setMode('instructor')}>강사용 대시보드</Button>
          </div>
        </>
      )}

      {step === 'm1' && currentM1 && (
        <>
          <Header step={`M1 ${m1Index + 1}/6`} title={currentM1.title} subtitle={currentM1.purposeText} />
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-900" style={{ width: `${progress}%` }} /></div>
          <div className="space-y-4">
            {currentM1.screenId === 'M1-4' && <Card className="bg-amber-50 text-amber-900"><div className="font-bold">주의하세요</div><p className="mt-2 text-sm leading-6">{complianceWarning}</p><div className="mt-3 rounded-2xl bg-white/60 p-3 text-sm leading-6">서울 ○○병원 김○○ 교수님 → 한 핵심 고객<br />A제품 매출 00% 감소 → 핵심 제품 성과가 기대보다 낮은 상황</div></Card>}
            <Card><M1Input screen={currentM1} value={m1Answers[currentM1.saveKey]} onChange={updateM1Answer} /></Card>
            {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <SaveMessage status={saveStatus} />
          </div>
          <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
            <Button variant="secondary" onClick={() => { if (m1Index === 0) setStep('home'); else setM1Index((prev) => prev - 1); }}>{m1Index === 0 ? '모듈 홈' : '이전으로'}</Button>
            <Button onClick={nextM1}>{m1Index === m1Screens.length - 1 ? 'M1 완료하기' : '다음으로'}</Button>
          </div>
        </>
      )}

      {step === 'select' && (
        <>
          <Header step={`${activeModule} Lab 선택`} title={`${moduleTitles[activeModule]} 상황 선택`} subtitle={moduleCoreQuestions[activeModule]} />
          <Card className="mb-4 bg-slate-50">
            <p className="text-sm leading-6 text-slate-700"><strong>Full Lab</strong>은 깊게 다루고 실행안까지 저장하는 실습입니다.</p>
            <p className="mt-1 text-sm leading-6 text-slate-700"><strong>Lite Lab</strong>은 빠르게 판단하고 토의할 문장 하나를 남기는 실습입니다.</p>
          </Card>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={selectRecommended}>추천대로 선택하기</Button>
            <Button variant="ghost" onClick={() => updateLabSelection({ fullScenarioId: '', liteScenarioIds: [] })}>선택 초기화</Button>
          </div>
          <Card className="mb-4">
            <div className="text-sm font-bold text-slate-800">선택 현황</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">Full Lab: {currentSelection.fullScenarioId || '아직 선택하지 않았습니다.'}</div>
            <div className="text-sm leading-6 text-slate-700">Lite Lab: {currentSelection.liteScenarioIds.join(', ') || '아직 선택하지 않았습니다.'}</div>
          </Card>
          <div className="space-y-3">
            {scenarioMap[activeModule].map((scenario) => {
              const isFull = currentSelection.fullScenarioId === scenario.id;
              const isLite = currentSelection.liteScenarioIds.includes(scenario.id);
              return <Card key={scenario.id} className={isFull || isLite ? 'ring-1 ring-slate-900' : ''}>
                <div className="mb-2 flex flex-wrap gap-2">{scenario.recommendedFull && <Badge>추천 Full</Badge>}{scenario.recommendedLite && <Badge tone="blue">추천 Lite</Badge>}{scenario.complianceLevel === 'high' && <Badge tone="amber">민감정보 주의</Badge>}{isFull && <Badge>Full 선택됨</Badge>}{isLite && <Badge tone="blue">Lite 선택됨</Badge>}</div>
                <div className="text-sm font-bold text-slate-500">{scenario.id}</div>
                <h2 className="mt-1 text-lg font-extrabold leading-7 text-slate-950">{scenario.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{scenario.summary}</p>
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><strong>최종 산출물</strong><br />{scenario.outputTitle}</div>
                {scenario.complianceLevel === 'high' && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{complianceWarning}</div>}
                <div className="mt-4 grid grid-cols-2 gap-2"><Button variant={isFull ? 'primary' : 'secondary'} onClick={() => selectFull(scenario.id)}>Full로 선택</Button><Button variant={isLite ? 'primary' : 'secondary'} onClick={() => toggleLite(scenario.id)}>{isLite ? 'Lite 해제' : 'Lite로 선택'}</Button></div>
              </Card>;
            })}
          </div>
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="mt-4"><SaveMessage status={saveStatus} /></div>
          <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
            <Button variant="secondary" onClick={() => setStep('home')}>모듈 홈</Button>
            <Button onClick={saveSelection}>선택 저장하기</Button>
          </div>
        </>
      )}
    </main>
  );
}
