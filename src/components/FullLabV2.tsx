import { useEffect, useState } from 'react';
import { Button, Card, Header, Save, Select, TextArea } from './common';
import {
  aiChecks,
  buildPrompt,
  dilemma,
  emptyDraft,
  flowLabels,
  flowSteps,
  outputTitles,
  outputs,
  promptChecks,
  surprises,
  toggle,
  toggleMax,
  validateFlowStep,
  type AiOutput,
  type Draft,
  type SaveStatus,
  type Scenario,
  type StepKey,
} from '../data/m2Data';

interface Participant {
  participantId: string;
  name: string;
  groupName: string;
  sessionCode: string;
  courseId: string;
}

interface FullLabV2Props {
  participant: Participant;
  scenario: Scenario;
  selectedLite: string;
  callAppsScript: (action: string, payload: unknown) => Promise<unknown>;
  onBackToSelection: () => void;
  onComplete: () => void;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeDraft(draft: Draft): Draft {
  return { ...draft, checkDate: draft.checkDate === '다음 주 금요일 오전' ? '' : draft.checkDate };
}

function getStoredDraft(scenarioId: string): Draft {
  try {
    const saved = localStorage.getItem(`full_v2_${scenarioId}`);
    return saved ? normalizeDraft(JSON.parse(saved) as Draft) : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

export function FullLabV2({ participant, scenario, selectedLite, callAppsScript, onBackToSelection, onComplete }: FullLabV2Props) {
  const [flow, setFlow] = useState<StepKey>('scenario');
  const [draft, setDraft] = useState<Draft>(() => getStoredDraft(scenario.id));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const flowIndex = flowSteps.indexOf(flow);
  const selectedOutputs = outputs.filter((output) => draft.outputIds.includes(output.id));

  useEffect(() => {
    localStorage.setItem(`full_v2_${scenario.id}`, JSON.stringify(draft));
    if (Object.values(draft).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value)) && status !== 'saving' && status !== 'saved') {
      setStatus('draft');
    }
  }, [draft, scenario.id, status]);

  function updateDraft(next: Partial<Draft>) {
    setDraft((prev) => normalizeDraft({ ...prev, ...next }));
  }

  function makeSavePayload() {
    const promptText = buildPrompt(scenario, draft);
    const outputTitle = outputTitles(draft.outputIds) || scenario.outputTitle;
    return {
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
      labType: 'full',
      outputTitle,
      coreIssue: scenario.dilemma,
      firstDecision: `${draft.firstChoice} / ${draft.reason}`,
      promptText,
      aiAnswer: draft.aiAnswer,
      revisionChecks: draft.aiChecks,
      revisionNotes: draft.aiNotes,
      finalOutput: draft.finalPlan,
      actionText: draft.finalPlan,
      checkDate: draft.checkDate,
      dilemmaOptionA: dilemma.A.title,
      dilemmaOptionB: dilemma.B.title,
      firstChoice: draft.firstChoice,
      firstChoiceReason: draft.reason,
      firstChoiceOpportunity: draft.opportunities.join('; '),
      firstChoiceRisk: draft.risks.join('; '),
      surpriseVariables: surprises.map((item) => `${item.title}: ${item.desc}`).join('\n'),
      secondChoiceType: draft.second,
      secondChoiceReason: draft.secondReason,
      selectedOutputType: outputTitle,
      selectedTemplateId: draft.outputIds.join('; '),
      promptReviewChecks: draft.promptChecks.join('; '),
      aiReviewChecks: draft.aiChecks.join('; '),
      aiRevisionNotes: draft.aiNotes,
      finalActionPlan: draft.finalPlan,
      saveStatus: 'saved',
    };
  }

  async function saveFullLab() {
    setError('');
    setStatus('saving');
    const payload = makeSavePayload();
    localStorage.setItem(`full_v2_pending_${scenario.id}`, JSON.stringify(payload));

    try {
      // 저장 속도 개선: 최종 결과는 Responses에 1회 저장합니다.
      // ModuleProgress는 대시보드에서 Responses의 full 응답을 기준으로도 집계됩니다.
      await callAppsScript('saveResponse', payload);
      localStorage.removeItem(`full_v2_pending_${scenario.id}`);
      setStatus('saved');
      setFlow('saved');
    } catch {
      setStatus('failed');
      setError('저장이 지연되고 있습니다. 입력하신 내용은 이 기기에 유지됩니다. 잠시 후 다시 저장해 주세요.');
    }
  }

  function goNext() {
    const validation = validateFlowStep(flow, draft);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    if (flow === 'final') {
      void saveFullLab();
      return;
    }
    setFlow(flowSteps[Math.min(flowIndex + 1, flowSteps.length - 1)]);
  }

  function goPrevious() {
    setError('');
    if (flowIndex === 0) {
      onBackToSelection();
      return;
    }
    setFlow(flowSteps[flowIndex - 1]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-8 pb-28">
      <Header step={`Full Lab v2 ${flowIndex + 1}/12`} title={flowLabels[flow]} subtitle={scenario.title} />
      <div className="mb-4 h-2 rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.round(((flowIndex + 1) / flowSteps.length) * 100)}%` }} />
      </div>

      <div className="space-y-4">
        {flow === 'scenario' && <ScenarioStep scenario={scenario} />}
        {flow === 'choice' && <ChoiceStep draft={draft} setDraft={setDraft} />}
        {flow === 'reason' && <ReasonStep draft={draft} updateDraft={updateDraft} />}
        {flow === 'surprise' && <SurpriseStep />}
        {flow === 'second' && <SecondChoiceStep draft={draft} updateDraft={updateDraft} />}
        {flow === 'output' && <OutputStep draft={draft} updateDraft={updateDraft} />}
        {flow === 'prompt' && <PromptStep scenario={scenario} draft={draft} updateDraft={updateDraft} />}
        {flow === 'promptReview' && <PromptReviewStep draft={draft} updateDraft={updateDraft} scenario={scenario} />}
        {flow === 'aiPaste' && <TextArea label="AI 결과 붙여넣기 또는 직접 초안" value={draft.aiAnswer} onChange={(value) => updateDraft({ aiAnswer: value })} placeholder="AI 결과를 붙여넣거나 직접 초안을 작성해 주세요." />}
        {flow === 'aiReview' && <AiReviewStep draft={draft} updateDraft={updateDraft} />}
        {flow === 'final' && <FinalStep draft={draft} updateDraft={updateDraft} selectedOutputs={selectedOutputs} />}
        {flow === 'saved' && <SavedStep draft={draft} />}

        {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Save status={status} />
        {status === 'failed' && flow === 'final' && <Button variant="secondary" onClick={() => void saveFullLab()}>다시 저장하기</Button>}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 bg-white p-4">
        <Button variant="secondary" onClick={goPrevious}>{flow === 'scenario' ? 'Lab 선택' : '이전'}</Button>
        {flow === 'saved' ? <Button onClick={onComplete}>모듈 홈</Button> : <Button onClick={goNext}>{flow === 'final' ? '저장' : '다음'}</Button>}
      </div>
    </main>
  );
}

function ScenarioStep({ scenario }: { scenario: Scenario }) {
  return <>
    <Card><b>핵심 상황</b><p className="mt-2 text-sm leading-6">{scenario.situation}</p></Card>
    <Card><b>팀장 고민</b><p className="mt-2 text-sm leading-6">{scenario.dilemma}</p></Card>
    <Card className="bg-slate-50"><b>이번 Lab에서 만들 것</b><p className="mt-2 text-sm leading-6">{scenario.outputTitle}</p></Card>
  </>;
}

function ChoiceStep({ draft, setDraft }: { draft: Draft; setDraft: (draft: Draft) => void }) {
  return <>
    <Select title={`A. ${dilemma.A.title}`} desc={dilemma.A.desc} selected={draft.firstChoice === 'A'} onClick={() => setDraft({ ...emptyDraft, firstChoice: 'A' })} />
    <Select title={`B. ${dilemma.B.title}`} desc={dilemma.B.desc} selected={draft.firstChoice === 'B'} onClick={() => setDraft({ ...emptyDraft, firstChoice: 'B' })} />
  </>;
}

function ReasonStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  const option = draft.firstChoice === 'A' ? dilemma.A : dilemma.B;
  return <>
    <TextArea label="선택한 이유" value={draft.reason} onChange={(value) => updateDraft({ reason: value, prompt: '', promptChecks: [] })} placeholder="이 선택을 한 이유를 한 줄 이상 적어 주세요." />
    <Card><b>이 선택을 통한 기회</b><div className="mt-3 space-y-2">{option.opp.map((item) => <Select key={item} title={item} selected={draft.opportunities.includes(item)} onClick={() => updateDraft({ opportunities: toggle(draft.opportunities, item), prompt: '', promptChecks: [] })} />)}</div></Card>
    <Card><b>이 선택의 위험</b><div className="mt-3 space-y-2">{option.risk.map((item) => <Select key={item} title={item} selected={draft.risks.includes(item)} onClick={() => updateDraft({ risks: toggle(draft.risks, item), prompt: '', promptChecks: [] })} />)}</div></Card>
  </>;
}

function SurpriseStep() {
  return <>{surprises.map((item, index) => <Card key={item.title}><b>돌발 {index + 1}. {item.title}</b><p className="mt-2 text-sm leading-6">{item.desc}</p></Card>)}</>;
}

function SecondChoiceStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  return <>
    <Select title="처음 선택을 유지한다" selected={draft.second === 'maintain'} onClick={() => updateDraft({ second: 'maintain', prompt: '', promptChecks: [] })} />
    <Select title="일부 보완한다" selected={draft.second === 'adjust'} onClick={() => updateDraft({ second: 'adjust', prompt: '', promptChecks: [] })} />
    <Select title="다른 방향으로 전환한다" selected={draft.second === 'switch'} onClick={() => updateDraft({ second: 'switch', prompt: '', promptChecks: [] })} />
    <TextArea label="그 이유와 수정 방향" value={draft.secondReason} onChange={(value) => updateDraft({ secondReason: value, prompt: '', promptChecks: [] })} />
  </>;
}

function OutputStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  return <>
    <Card className="bg-slate-50"><p className="text-sm">AI 산출물은 최대 2개까지 선택할 수 있습니다. 수정하면 다음 단계의 프롬프트도 새 산출물 기준으로 다시 생성됩니다.</p></Card>
    {outputs.map((output) => {
      const nextOutputIds = toggleMax(draft.outputIds, output.id, 2);
      return <Select key={output.id} title={output.title} desc={output.desc} selected={draft.outputIds.includes(output.id)} onClick={() => updateDraft({ outputIds: nextOutputIds, prompt: '', promptChecks: [] })} />;
    })}
  </>;
}

function PromptStep({ scenario, draft, updateDraft }: { scenario: Scenario; draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  const generatedPrompt = buildPrompt(scenario, draft);
  return <>
    <Card><p className="text-sm leading-6">현재 선택한 산출물과 판단 내용을 기준으로 프롬프트를 생성합니다. 이전 단계에서 산출물을 바꾸면 이 내용도 함께 바뀝니다.</p></Card>
    <Button onClick={() => updateDraft({ prompt: generatedPrompt })}>프롬프트 생성</Button>
    <Card><pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5">{generatedPrompt}</pre></Card>
  </>;
}

function PromptReviewStep({ scenario, draft, updateDraft }: { scenario: Scenario; draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  const generatedPrompt = buildPrompt(scenario, draft);
  return <>
    <Card><div className="space-y-2">{promptChecks.map((item) => <Select key={item} title={item} selected={draft.promptChecks.includes(item)} onClick={() => updateDraft({ promptChecks: toggle(draft.promptChecks, item) })} />)}</div></Card>
    <Card><pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5">{generatedPrompt}</pre></Card>
    <Button onClick={async () => { updateDraft({ prompt: generatedPrompt }); try { await navigator.clipboard.writeText(generatedPrompt); } catch { /* ignore */ } }}>현재 프롬프트 복사</Button>
  </>;
}

function AiReviewStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  return <>
    <Card><div className="space-y-2">{aiChecks.map((item) => <Select key={item} title={item} selected={draft.aiChecks.includes(item)} onClick={() => updateDraft({ aiChecks: toggle(draft.aiChecks, item) })} />)}</div></Card>
    <TextArea label="내가 최종적으로 고칠 부분" value={draft.aiNotes} onChange={(value) => updateDraft({ aiNotes: value })} />
  </>;
}

function ExampleCard({ selectedOutputs }: { selectedOutputs: AiOutput[] }) {
  const hasDialogue = selectedOutputs.some((output) => output.id === 'dialogue');
  const hasFollowup = selectedOutputs.some((output) => output.id === 'followup');
  const hasAgreement = selectedOutputs.some((output) => output.id === 'agreement');
  const hasQuestions = selectedOutputs.some((output) => output.id === 'questions');
  return <Card className="bg-slate-50"><b>작성 예시</b><div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">{hasDialogue && <p>첫 문장: 오늘은 실적을 지적하려는 자리가 아니라, 최근 활동 중 어디에서 막히는지 함께 확인하려고 합니다.</p>}{hasQuestions && <p>확인 질문: 최근 고객 대화에서 가장 반응이 달라진 부분은 무엇이었나요?</p>}{hasAgreement && <p>합의 행동: 이번 주에는 핵심 고객 3곳의 후속 대화 내용을 함께 점검하겠습니다.</p>}{hasFollowup && <p>Follow-up 메시지: 오늘 이야기한 내용을 바탕으로 이번 주 실행 행동을 함께 확인해 보겠습니다.</p>}</div></Card>;
}

function FinalStep({ draft, updateDraft, selectedOutputs }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void; selectedOutputs: AiOutput[] }) {
  return <>
    <Card><b>선택 산출물</b><p className="mt-2 text-sm">{selectedOutputs.map((output) => output.title).join(' / ')}</p></Card>
    <ExampleCard selectedOutputs={selectedOutputs} />
    <TextArea label="최종 실행 계획 및 내용" value={draft.finalPlan} onChange={(value) => updateDraft({ finalPlan: value })} placeholder="예시를 참고해 실제 면담에서 사용할 문장과 실행 계획을 정리해 주세요." />
    <input className="w-full rounded-2xl border p-3" value={draft.checkDate} onChange={(event) => updateDraft({ checkDate: event.target.value })} placeholder="확인 시점 입력 예: 다음 주 금요일 오전" />
  </>;
}

function SavedStep({ draft }: { draft: Draft }) {
  return <>
    <Card className="bg-emerald-50 text-emerald-900"><b>저장되었습니다.</b><p className="mt-2 text-sm">오늘 남긴 실행안은 시트에서 확인할 수 있습니다.</p></Card>
    <Card><b>최종 실행계획</b><p className="mt-2 whitespace-pre-wrap text-sm">{draft.finalPlan}</p></Card>
  </>;
}
