import { useEffect, useState } from 'react';
import { Button, Card, Header, Save, Select, TextArea } from './common';
import { warning, type SaveStatus, type Scenario } from '../data/m2Data';

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
  hasNextLite: boolean;
}

type LiteStep = 'scenario' | 'choice' | 'reason' | 'action' | 'saved';
type AiHelpType = '' | 'polishSentence' | 'makeQuestions' | 'explainToTeam' | 'riskCheck';

type LiteDraft = {
  choiceCode: string;
  choice: string;
  reason: string;
  actionSentence: string;
  aiHelpType: AiHelpType;
  aiPrompt: string;
  aiPromptCopied: boolean;
  aiAnswer: string;
  finalSentence: string;
};

const emptyLiteDraft: LiteDraft = {
  choiceCode: '',
  choice: '',
  reason: '',
  actionSentence: '',
  aiHelpType: '',
  aiPrompt: '',
  aiPromptCopied: false,
  aiAnswer: '',
  finalSentence: '',
};

const liteSteps: LiteStep[] = ['scenario', 'choice', 'reason', 'action', 'saved'];
const liteLabels: Record<LiteStep, string> = {
  scenario: 'Lite 상황 읽기',
  choice: '빠른 판단 선택',
  reason: '한 줄 이유 입력',
  action: '실행 문장 작성 + AI 미니 도움',
  saved: '간략 저장 완료',
};

const defaultChoices = [
  { code: 'A', text: '활동량을 더 늘릴 필요가 있다.' },
  { code: 'B', text: '활동의 질과 상담 내용을 먼저 봐야 한다.' },
  { code: 'C', text: '고객 반응과 후속 조치 흐름을 함께 봐야 한다.' },
];

const aiHelpOptions: { id: AiHelpType; title: string; desc: string; request: string }[] = [
  { id: 'polishSentence', title: '실행 문장 다듬기', desc: '내가 쓴 실행 문장을 더 자연스럽고 현장감 있게 다듬습니다.', request: '내가 쓴 실행 문장을 영업팀장이 실제로 말할 수 있는 자연스러운 표현 3개로 다듬어 주세요.' },
  { id: 'makeQuestions', title: '팀원에게 할 질문 3개', desc: '팀원과 대화할 때 바로 쓸 확인 질문을 만듭니다.', request: '이 상황에서 팀원이 스스로 원인과 다음 행동을 생각하게 만드는 질문 3개를 작성해 주세요.' },
  { id: 'explainToTeam', title: '팀 미팅에서 설명할 말', desc: '팀원들에게 판단 기준을 설명하는 짧은 문장을 만듭니다.', request: '팀 미팅에서 이 판단 기준을 설명할 수 있는 짧은 말 3개 버전을 작성해 주세요.' },
  { id: 'riskCheck', title: '리스크 체크 질문', desc: '놓치기 쉬운 위험과 확인할 질문을 빠르게 점검합니다.', request: '이 판단을 실행하기 전에 놓치기 쉬운 리스크와 확인 질문을 3개로 정리해 주세요.' },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getStoredDraft(scenarioId: string): LiteDraft {
  try {
    const saved = localStorage.getItem(`lite_lab_${scenarioId}`);
    if (!saved) return emptyLiteDraft;
    return { ...emptyLiteDraft, ...(JSON.parse(saved) as Partial<LiteDraft>) };
  } catch {
    return emptyLiteDraft;
  }
}

function buildLitePrompt(scenario: Scenario, draft: LiteDraft) {
  const help = aiHelpOptions.find((option) => option.id === draft.aiHelpType);
  return `상황:
${scenario.situation}

내 빠른 판단:
${draft.choice}

선택 이유:
${draft.reason}

내가 작성한 실행 문장:
${draft.actionSentence}

요청:
${help?.request || '위 내용을 바탕으로 실행 문장을 더 자연스럽게 다듬어 주세요.'}

조건:
- ${warning}
- 제약영업 컴플라이언스를 고려해 주세요.
- 팀장이 실제 현장에서 말할 수 있는 짧은 표현으로 작성해 주세요.
- 5줄 이내로 작성해 주세요.`;
}

export function LiteLab({ participant, scenario, callAppsScript, onBackToSelection, onComplete, hasNextLite }: LiteLabProps) {
  const [step, setStep] = useState<LiteStep>('scenario');
  const [draft, setDraft] = useState<LiteDraft>(() => getStoredDraft(scenario.id));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
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

  async function copyLitePrompt() {
    setError('');
    setCopyMessage('');
    if (!draft.aiHelpType) {
      setError('AI로 받고 싶은 도움을 먼저 선택해 주세요.');
      return;
    }
    const prompt = buildLitePrompt(scenario, draft);
    updateDraft({ aiPrompt: prompt, aiPromptCopied: true });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyMessage('AI 미니 프롬프트가 복사되었습니다. 사용하는 AI 도구에 붙여넣어 보세요.');
    } catch {
      setCopyMessage('자동 복사가 되지 않았습니다. 아래 프롬프트를 직접 복사해 주세요.');
    }
  }

  async function saveLiteLab() {
    setError('');
    setStatus('saving');
    const finalSentence = draft.finalSentence.trim() || draft.actionSentence.trim();
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
      actionSentence: finalSentence,
      liteAiHelpType: draft.aiHelpType,
      litePromptText: draft.aiPrompt,
      litePromptCopied: draft.aiPromptCopied,
      liteAiAnswer: draft.aiAnswer,
      liteFinalSentence: finalSentence,
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
        {step === 'action' && <ActionAndMiniAiStep draft={draft} updateDraft={updateDraft} onCopyPrompt={copyLitePrompt} copyMessage={copyMessage} scenario={scenario} />}
        {step === 'saved' && <SavedStep draft={draft} hasNextLite={hasNextLite} />}

        {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Save status={status} />
        {status === 'failed' && step === 'action' && <Button variant="secondary" onClick={() => void saveLiteLab()}>다시 저장하기</Button>}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-white p-4">
        {step === 'saved' ? (
          <Button onClick={onComplete}>{hasNextLite ? '다음 Lite Lab으로' : '모듈 홈으로'}</Button>
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
    <Card className="bg-slate-50"><b>이번 Lite Lab에서 할 일</b><p className="mt-2 text-sm leading-6">빠른 판단을 선택하고, 한 줄 이유와 실행 문장 하나를 남깁니다. 마지막 화면에서 AI 미니 도움을 선택해 실행 문장을 다듬을 수 있습니다.</p></Card>
  </>;
}

function ChoiceStep({ draft, onSelect }: { draft: LiteDraft; onSelect: (choice: { code: string; text: string }) => void }) {
  return <>
    <Card className="bg-slate-50"><p className="text-sm leading-6">Lite Lab은 빠른 판단을 비교하는 실습입니다. 지금 가장 적절하다고 생각하는 선택지를 고르세요.</p></Card>
    {defaultChoices.map((choice) => <Select key={choice.code} title={`${choice.code}. ${choice.text}`} selected={draft.choiceCode === choice.code} onClick={() => onSelect(choice)} />)}
  </>;
}

function ActionAndMiniAiStep({ draft, updateDraft, onCopyPrompt, copyMessage, scenario }: { draft: LiteDraft; updateDraft: (next: Partial<LiteDraft>) => void; onCopyPrompt: () => void; copyMessage: string; scenario: Scenario }) {
  const prompt = draft.aiPrompt || buildLitePrompt(scenario, draft);
  return <>
    <TextArea label="실행 문장 또는 질문 1개" value={draft.actionSentence} onChange={(value) => updateDraft({ actionSentence: value, aiPrompt: '' })} placeholder="예: 이번 주에는 고객 반응과 후속 조치 흐름을 함께 점검하겠습니다." />
    <Card className="bg-slate-50"><b>AI 미니 도움</b><p className="mt-2 text-sm leading-6 text-slate-600">AI는 선택한 판단을 짧은 질문이나 현장 문장으로 다듬는 데만 가볍게 활용합니다. 결과 붙여넣기는 선택입니다.</p></Card>
    <div className="space-y-2">
      {aiHelpOptions.map((option) => <Select key={option.id} title={option.title} desc={option.desc} selected={draft.aiHelpType === option.id} onClick={() => updateDraft({ aiHelpType: option.id, aiPrompt: '' })} />)}
    </div>
    {draft.aiHelpType && <>
      <Button variant="secondary" onClick={onCopyPrompt}>AI 미니 프롬프트 생성·복사</Button>
      <Card><pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5">{prompt}</pre></Card>
      {copyMessage && <div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-700">{copyMessage}</div>}
      <TextArea label="AI 결과 붙여넣기 선택" value={draft.aiAnswer} onChange={(value) => updateDraft({ aiAnswer: value })} placeholder="AI 결과를 붙여넣고 참고할 수 있습니다. 필수는 아닙니다." />
      <TextArea label="최종 보완 실행 문장" value={draft.finalSentence} onChange={(value) => updateDraft({ finalSentence: value })} placeholder="AI 결과를 참고해 최종 문장을 보완해 주세요. 비워두면 위 실행 문장이 저장됩니다." />
    </>}
  </>;
}

function SavedStep({ draft, hasNextLite }: { draft: LiteDraft; hasNextLite: boolean }) {
  const finalSentence = draft.finalSentence.trim() || draft.actionSentence;
  return <>
    <Card className="bg-emerald-50 text-emerald-900"><b>간략 저장되었습니다.</b><p className="mt-2 text-sm">{hasNextLite ? '다음 Lite Lab으로 이어서 진행합니다.' : '이 응답은 강의 중 토의 소재와 내 저장 내용 보기에 활용됩니다.'}</p></Card>
    <Card><b>빠른 판단</b><p className="mt-2 text-sm leading-6">{draft.choice}</p><b className="mt-4 block">한 줄 이유</b><p className="mt-2 text-sm leading-6">{draft.reason}</p><b className="mt-4 block">최종 실행 문장</b><p className="mt-2 text-sm leading-6">{finalSentence}</p></Card>
  </>;
}
