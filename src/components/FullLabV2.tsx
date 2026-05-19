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

function getStoredDraft(scenarioId: string): Draft {
  const key = `full_v2_${scenarioId}`;
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as Draft) : emptyDraft;
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
    setDraft((prev) => ({ ...prev, ...next }));
  }

  async function saveFullLab() {
    setStatus('saving');
    const outputTitle = outputTitles(draft.outputIds) || scenario.outputTitle;

    try {
      await callAppsScript('saveResponse', {
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
        promptText: draft.prompt,
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
      });

      await callAppsScript('saveProgress', {
        participantId: participant.participantId,
        sessionCode: participant.sessionCode,
        courseId: participant.courseId,
        moduleId: 'M2',
        moduleTitle: '성과관리',
        status: 'in_progress',
        selectedFullScenarioId: scenario.id,
        selectedLiteScenarioIds: [selectedLite],
        completedFullCount: 1,
        completedLiteCount: 0,
        requiredFullCount: 1,
        requiredLiteCount: 1,
        lastLabType: 'full',
        lastStep: 'FullV2-saved',
      });

      setStatus('saved');
      setFlow('saved');
    } catch {
      setStatus('failed');
      setError('저장이 지연되고 있습니다. 입력하신 내용은 이 기기에 유지됩니다.');
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

    const nextStep = flowSteps[Math.min(flowIndex + 1, flowSteps.length - 1)];
    setFlow(nextStep);
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
    <TextArea label="선택한 이유" value={draft.reason} onChange={(value) => updateDraft({ reason: value })} placeholder="이 선택을 한 이유를 한 줄 이상 적어 주세요." />
    <Card><b>이 선택을 통한 기회</b><div className="mt-3 space-y-2">{option.opp.map((item) => <Select key={item} title={item} selected={draft.opportunities.includes(item)} onClick={() => updateDraft({ opportunities: toggle(draft.opportunities, item) })} />)}</div></Card>
    <Card><b>이 선택의 위험</b><div className="mt-3 space-y-2">{option.risk.map((item) => <Select key={item} title={item} selected={draft.risks.includes(item)} onClick={() => updateDraft({ risks: toggle(draft.risks, item) })} />)}</div></Card>
  </>;
}

function SurpriseStep() {
  return <>{surprises.map((item, index) => <Card key={item.title}><b>돌발 {index + 1}. {item.title}</b><p className="mt-2 text-sm leading-6">{item.desc}</p></Card>)}</>;
}

function SecondChoiceStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  return <>
    <Select title="처음 선택을 유지한다" selected={draft.second === 'maintain'} onClick={() => updateDraft({ second: 'maintain' })} />
    <Select title="일부 보완한다" selected={draft.second === 'adjust'} onClick={() => updateDraft({ second: 'adjust' })} />
    <Select title="다른 방향으로 전환한다" selected={draft.second === 'switch'} onClick={() => updateDraft({ second: 'switch' })} />
    <TextArea label="그 이유와 수정 방향" value={draft.secondReason} onChange={(value) => updateDraft({ secondReason: value })} />
  </>;
}

function OutputStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  return <>
    <Card className="bg-slate-50"><p className="text-sm">AI 산출물은 최대 2개까지 선택할 수 있습니다.</p></Card>
    {outputs.map((output) => <Select key={output.id} title={output.title} desc={output.desc} selected={draft.outputIds.includes(output.id)} onClick={() => updateDraft({ outputIds: toggleMax(draft.outputIds, output.id, 2) })} />)}
  </>;
}

function PromptStep({ scenario, draft, updateDraft }: { scenario: Scenario; draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  const prompt = draft.prompt || buildPrompt(scenario, draft);
  return <>
    <Card><p className="text-sm leading-6">1차·2차 판단과 돌발상황을 반영해 AI 프롬프트를 생성합니다.</p></Card>
    <Button onClick={() => updateDraft({ prompt })}>프롬프트 생성</Button>
    <Card><pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5">{prompt}</pre></Card>
  </>;
}

function PromptReviewStep({ scenario, draft, updateDraft }: { scenario: Scenario; draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  const prompt = draft.prompt || buildPrompt(scenario, draft);
  return <>
    <Card><div className="space-y-2">{promptChecks.map((item) => <Select key={item} title={item} selected={draft.promptChecks.includes(item)} onClick={() => updateDraft({ promptChecks: toggle(draft.promptChecks, item) })} />)}</div></Card>
    <Button onClick={async () => { updateDraft({ prompt }); try { await navigator.clipboard.writeText(prompt); } catch { /* ignore */ } }}>프롬프트 복사</Button>
  </>;
}

function AiReviewStep({ draft, updateDraft }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void }) {
  return <>
    <Card><div className="space-y-2">{aiChecks.map((item) => <Select key={item} title={item} selected={draft.aiChecks.includes(item)} onClick={() => updateDraft({ aiChecks: toggle(draft.aiChecks, item) })} />)}</div></Card>
    <TextArea label="내가 최종적으로 고칠 부분" value={draft.aiNotes} onChange={(value) => updateDraft({ aiNotes: value })} />
  </>;
}

function FinalStep({ draft, updateDraft, selectedOutputs }: { draft: Draft; updateDraft: (next: Partial<Draft>) => void; selectedOutputs: AiOutput[] }) {
  return <>
    <Card><b>선택 산출물</b><p className="mt-2 text-sm">{selectedOutputs.map((output) => output.title).join(' / ')}</p></Card>
    <TextArea label="최종 실행 계획 및 내용" value={draft.finalPlan} onChange={(value) => updateDraft({ finalPlan: value })} />
    <input className="w-full rounded-2xl border p-3" value={draft.checkDate} onChange={(event) => updateDraft({ checkDate: event.target.value })} />
  </>;
}

function SavedStep({ draft }: { draft: Draft }) {
  return <>
    <Card className="bg-emerald-50 text-emerald-900"><b>저장되었습니다.</b><p className="mt-2 text-sm">오늘 남긴 실행안은 시트에서 확인할 수 있습니다.</p></Card>
    <Card><b>최종 실행계획</b><p className="mt-2 whitespace-pre-wrap text-sm">{draft.finalPlan}</p></Card>
  </>;
}
