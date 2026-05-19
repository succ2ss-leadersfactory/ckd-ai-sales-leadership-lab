import { useEffect, useState } from 'react';
import { Button, Card, Header, Save, Select, TextArea } from './common';
import { type SaveStatus, type Scenario } from '../data/m2Data';

interface Participant {
  participantId: string;
  name: string;
  groupName: string;
  sessionCode: string;
  courseId: string;
}

interface LiteLabProps {
  participant: Participant;
  scenario: Scenario;
  selectedFull: string;
  callAppsScript: (action: string, payload: unknown) => Promise<unknown>;
  onBackToHome: () => void;
  onBackToSelection: () => void;
  onComplete: () => void;
}

type LiteStep = 'scenario' | 'choice' | 'reason' | 'action' | 'saved';

type LiteDraft = {
  choiceCode: string;
  choice: string;
  reason: string;
  actionSentence: string;
};

const liteSteps: LiteStep[] = ['scenario', 'choice', 'reason', 'action', 'saved'];
const liteLabels: Record<LiteStep, string> = {
  scenario: 'Lite 상황 읽기',
  choice: '빠른 판단 선택',
  reason: '한 줄 이유 입력',
  action: '실행 문장 작성',
  saved: '간략 저장 완료',
};

const defaultChoices = [
  { code: 'A', text: '활동량을 더 늘릴 필요가 있다.' },
  { code: 'B', text: '활동의 질과 상담 내용을 먼저 봐야 한다.' },
  { code: 'C', text: '고객 반응과 후속 조치 흐름을 함께 봐야 한다.' },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getStoredDraft(scenarioId: string): LiteDraft {
  try {
    const saved = localStorage.getItem(`lite_lab_${scenarioId}`);
    return saved ? (JSON.parse(saved) as LiteDraft) : { choiceCode: '', choice: '', reason: '', actionSentence: '' };
  } catch {
    return { choiceCode: '', choice: '', reason: '', actionSentence: '' };
  }
}

export function LiteLab({ participant, scenario, callAppsScript, onBackToSelection, onComplete }: LiteLabProps) {
  const [step, setStep] = useState<LiteStep>('scenario');
  const [draft, setDraft] = useState<LiteDraft>(() => getStoredDraft(scenario.id));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const stepIndex = liteSteps.indexOf(step);

  useEffect(() => {
    localStorage.setItem(`lite_lab_${scenario.id}`, JSON.stringify(draft));
    if (Object.values(draft).some(Boolean) && status !== 'saving' && status !== 'saved') {
      setStatus('draft');
    }
  }, [draft, scenario.id, status]);

  function updateDraft(next: Partial<LiteDraft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function validate() {
    if (step === 'choice' && !draft.choiceCode) return '빠른 판단을 하나 선택해 주세요.';
    if (step === 'reason' && !draft.reason.trim()) return '그렇게 판단한 이유를 한 줄로 입력해 주세요.';
    if (step === 'action' && !draft.actionSentence.trim()) return '실행 문장 또는 질문을 한 문장으로 입력해 주세요.';
    return '';
  }

  async function saveLiteLab() {
    setError('');
    setStatus('saving');
    const payload = {
      responseId: createId('R'),
      participantId: participant.participantId,
      sessionCode: participant.sessionCode,
      courseId: participant.courseId,
      name: participant.name,
      groupName: participant.groupName,
      moduleId: 'M2',
      moduleTitle: '성과관리',
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      labType: 'lite',
      outputTitle: scenario.outputTitle,
      quickQuestion: '이 상황에서 먼저 볼 것은 무엇입니까?',
      quickChoiceCode: draft.choiceCode,
      quickChoice: draft.choice,
      quickReason: draft.reason,
      actionSentence: draft.actionSentence,
      saveStatus: 'saved',
    };

    localStorage.setItem(`lite_pending_${scenario.id}`, JSON.stringify(payload));

    try {
      await callAppsScript('saveResponse', payload);
      localStorage.removeItem(`lite_pending_${scenario.id}`);
      setStatus('saved');
      setStep('saved');
    } catch {
      setStatus('failed');
      setError('저장이 지연되고 있습니다. 입력하신 내용은 이 기기에 유지됩니다. 잠시 후 다시 저장해 주세요.');
    }
  }

  function goNext() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    if (step === 'action') {
      void saveLiteLab();
      return;
    }
    setStep(liteSteps[Math.min(stepIndex + 1, liteSteps.length - 1)]);
  }

  function goPrevious() {
    setError('');
    if (stepIndex === 0) {
      onBackToSelection();
      return;
    }
    setStep(liteSteps[stepIndex - 1]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-8 pb-28">
      <Header step={`Lite Lab ${stepIndex + 1}/5`} title={liteLabels[step]} subtitle={scenario.title} />
      <div className="mb-4 h-2 rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.round(((stepIndex + 1) / liteSteps.length) * 100)}%` }} />
      </div>

      <div className="space-y-4">
        {step === 'scenario' && <ScenarioStep scenario={scenario} />}
        {step === 'choice' && <ChoiceStep draft={draft} onSelect={(choice) => updateDraft({ choiceCode: choice.code, choice: choice.text })} />}
        {step === 'reason' && <TextArea label="그렇게 판단한 이유" value={draft.reason} onChange={(value) => updateDraft({ reason: value })} placeholder="예: 활동량은 충분하지만 후속 조치 흐름에서 성과 전환이 막히고 있기 때문입니다." />}
        {step === 'action' && <TextArea label="실행 문장 또는 질문 1개" value={draft.actionSentence} onChange={(value) => updateDraft({ actionSentence: value })} placeholder="예: 이번 주에는 고객 반응과 후속 조치 흐름을 함께 점검하겠습니다." />}
        {step === 'saved' && <SavedStep draft={draft} />}

        {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Save status={status} />
        {status === 'failed' && step === 'action' && <Button variant="secondary" onClick={() => void saveLiteLab()}>다시 저장하기</Button>}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-white p-4">
        {step === 'saved' ? (
          <Button onClick={onComplete}>모듈 홈으로</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={goPrevious}>{step === 'scenario' ? 'Lab 선택' : '이전'}</Button>
            <Button onClick={goNext}>{step === 'action' ? '간략 저장하기' : '다음'}</Button>
          </div>
        )}
      </div>
    </main>
  );
}

function ScenarioStep({ scenario }: { scenario: Scenario }) {
  return <>
    <Card><b>Lite Lab 상황</b><p className="mt-2 text-sm leading-6">{scenario.situation}</p></Card>
    <Card className="bg-slate-50"><b>이번 Lite Lab에서 할 일</b><p className="mt-2 text-sm leading-6">빠른 판단을 선택하고, 한 줄 이유와 실행 문장 하나를 남깁니다.</p></Card>
  </>;
}

function ChoiceStep({ draft, onSelect }: { draft: LiteDraft; onSelect: (choice: { code: string; text: string }) => void }) {
  return <>
    <Card className="bg-slate-50"><p className="text-sm leading-6">Lite Lab은 빠른 판단을 비교하는 실습입니다. 지금 가장 적절하다고 생각하는 선택지를 고르세요.</p></Card>
    {defaultChoices.map((choice) => <Select key={choice.code} title={`${choice.code}. ${choice.text}`} selected={draft.choiceCode === choice.code} onClick={() => onSelect(choice)} />)}
  </>;
}

function SavedStep({ draft }: { draft: LiteDraft }) {
  return <>
    <Card className="bg-emerald-50 text-emerald-900"><b>간략 저장되었습니다.</b><p className="mt-2 text-sm">이 응답은 강의 중 토의 소재와 내 저장 내용 보기에 활용됩니다.</p></Card>
    <Card><b>빠른 판단</b><p className="mt-2 text-sm leading-6">{draft.choice}</p><b className="mt-4 block">한 줄 이유</b><p className="mt-2 text-sm leading-6">{draft.reason}</p><b className="mt-4 block">실행 문장</b><p className="mt-2 text-sm leading-6">{draft.actionSentence}</p></Card>
  </>;
}