export type StepKey = 'scenario' | 'choice' | 'reason' | 'surprise' | 'second' | 'output' | 'prompt' | 'promptReview' | 'aiPaste' | 'aiReview' | 'final' | 'saved';
export type SecondChoice = '' | 'maintain' | 'adjust' | 'switch';
export type SaveStatus = 'idle' | 'draft' | 'saving' | 'saved' | 'failed';

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  situation: string;
  dilemma: string;
  outputTitle: string;
  recommendedFull?: boolean;
  recommendedLite?: boolean;
}

export interface Draft {
  firstChoice: '' | 'A' | 'B';
  reason: string;
  opportunities: string[];
  risks: string[];
  second: SecondChoice;
  secondReason: string;
  outputIds: string[];
  prompt: string;
  promptChecks: string[];
  aiAnswer: string;
  aiChecks: string[];
  aiNotes: string;
  finalPlan: string;
  checkDate: string;
}

export interface AiOutput {
  id: string;
  title: string;
  desc: string;
  template: string;
}

export const emptyDraft: Draft = {
  firstChoice: '',
  reason: '',
  opportunities: [],
  risks: [],
  second: '',
  secondReason: '',
  outputIds: [],
  prompt: '',
  promptChecks: [],
  aiAnswer: '',
  aiChecks: [],
  aiNotes: '',
  finalPlan: '',
  checkDate: '다음 주 금요일 오전',
};

export const flowSteps: StepKey[] = ['scenario', 'choice', 'reason', 'surprise', 'second', 'output', 'prompt', 'promptReview', 'aiPaste', 'aiReview', 'final', 'saved'];
export const flowLabels: Record<StepKey, string> = { scenario: '상황 읽기', choice: '딜레마 A/B 선택', reason: '선택 이유·기회·위험', surprise: '돌발상황 3개', second: '2차 선택', output: 'AI 산출물 선택', prompt: '프롬프트 생성', promptReview: '프롬프트 검토·복사', aiPaste: 'AI 결과 붙여넣기', aiReview: 'AI 결과 검토', final: '최종 실행계획', saved: '저장 완료' };
export const warning = '고객명, 병원명, 의사명, 내부 전략, 민감한 수치, 승인되지 않은 제품 표현은 입력하지 마세요.';

export const scenarios: Scenario[] = [
  { id: 'M2-1', title: '목표는 올라갔는데 팀원들은 납득하지 못합니다', summary: '목표 상향에 대한 수용성과 실행 행동을 정리합니다.', situation: '본부에서 핵심 제품 목표를 상향 조정했습니다. 팀원들은 현장 상황과 맞지 않는다며 부담을 느낍니다.', dilemma: '목표 긴장감은 유지하면서도 팀원들이 납득할 수 있게 설명해야 합니다.', outputTitle: '팀 미팅 목표 설명 준비' },
  { id: 'M2-2', title: '활동은 많은데 성과로 연결되지 않습니다', summary: '활동량과 활동의 질을 구분합니다.', situation: '방문 건수와 기록은 충분하지만 성과 전환율은 낮습니다.', dilemma: '활동량을 더 늘릴지, 활동의 질을 점검할지 판단해야 합니다.', outputTitle: '이번 주 성과개선 계획', recommendedLite: true },
  { id: 'M2-5', title: '성과 개선 면담이 압박처럼 받아들여집니다', summary: '성과 문제와 팀원의 방어감을 함께 다루는 면담 상황입니다.', situation: '성과가 흔들리는 팀원과 면담하려 합니다. 팀원은 면담 일정만 잡혀도 “또 실적 이야기겠네요”라고 반응합니다.', dilemma: '성과 문제는 명확히 다루어야 하지만, 대화 방식이 압박처럼 들리면 팀원은 방어적으로 반응할 수 있습니다.', outputTitle: '성과 1:1 면담 준비', recommendedFull: true },
];

export const dilemma = {
  A: { title: '성과 문제를 명확히 짚고 개선 행동을 요구한다', desc: '성과 기준과 현재 미달 지점을 분명히 확인하고 이번 주 바꿀 행동을 합의합니다.', opp: ['성과 이슈 명확화', '빠른 개선 행동 합의', '책임 기준 강화', '본부 요구 대응 용이'], risk: ['팀원 방어감 증가', '질책으로 해석될 가능성', '관계 위축', '실제 원인 파악 부족'] },
  B: { title: '팀원의 방어감을 낮추기 위해 먼저 어려움과 맥락을 듣는다', desc: '성과 이야기를 바로 꺼내기보다 최근 활동에서 막힌 지점과 어려움을 먼저 확인합니다.', opp: ['대화 수용성 증가', '실제 원인 파악', '신뢰 유지', '팀원의 자기진단 유도'], risk: ['성과 이슈가 흐려짐', '개선 속도 지연', '책임 기준 약화', '면담이 위로로만 끝날 가능성'] },
};

export const surprises = [
  { title: '본부의 빠른 개선 요구', desc: '본부에서 이번 주 안에 개선 방향과 다음 행동을 보고해 달라고 요청했습니다.' },
  { title: '팀원의 방어적 반응', desc: '팀원이 면담 전 “저만 문제라고 보시는 건가요?”라고 말했습니다.' },
  { title: '활동 데이터 해석 불일치', desc: '방문 건수는 충분하지만 고객 반응과 후속 조치의 질에 대한 해석이 다릅니다.' },
];

export const outputs: AiOutput[] = [
  { id: 'dialogue', title: '성과 1:1 면담 대화문', desc: '첫 문장, 확인 질문, 개선 행동 합의까지 포함합니다.', template: 'template_m2_5_performance_1on1' },
  { id: 'questions', title: '성과 원인 확인 질문 리스트', desc: '활동량, 상담 품질, 고객 반응을 확인할 질문을 만듭니다.', template: 'template_question_list' },
  { id: 'agreement', title: '개선 행동 합의문', desc: '이번 주 행동, 지원 방식, 확인 시점을 정리합니다.', template: 'template_action_agreement' },
  { id: 'followup', title: '면담 후 follow-up 메시지', desc: '면담 이후 팀원에게 보낼 짧은 정리 메시지를 만듭니다.', template: 'template_followup_message' },
];

export const promptChecks = ['민감정보가 들어가 있지 않다', '1차 선택과 2차 선택이 반영되어 있다', '돌발상황 3개가 반영되어 있다', '선택한 산출물 유형이 맞다'];
export const aiChecks = ['1차 선택과 2차 선택이 반영되어 있다', '돌발상황이 반영되어 있다', '표현이 실제 현장 언어에 가깝다', '실행하기 어렵거나 모호한 부분이 있다', '민감정보나 컴플라이언스 위험이 있다'];

export function toggle(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function toggleMax(list: string[], item: string, max: number) {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return list.length >= max ? list : [...list, item];
}

export function outputTitles(ids: string[]) {
  return ids.map((id) => outputs.find((o) => o.id === id)?.title).filter(Boolean).join(' / ');
}

export function buildPrompt(scenario: Scenario, draft: Draft) {
  const selectedOutputs = draft.outputIds.map((id) => outputs.find((o) => o.id === id)).filter(Boolean);
  const second = draft.second === 'maintain' ? '처음 선택 유지' : draft.second === 'switch' ? '다른 방향으로 전환' : '일부 보완';
  return `상황:\n${scenario.situation}\n\n딜레마:\nA. ${dilemma.A.title}\n- ${dilemma.A.desc}\n\nB. ${dilemma.B.title}\n- ${dilemma.B.desc}\n\n1차 선택:\n${draft.firstChoice}안\n\n선택 이유:\n${draft.reason}\n\n기회:\n${draft.opportunities.join(', ')}\n\n위험:\n${draft.risks.join(', ')}\n\n돌발상황:\n${surprises.map((x, i) => `${i + 1}. ${x.title}: ${x.desc}`).join('\n')}\n\n2차 선택:\n${second}\n\n2차 선택 이유:\n${draft.secondReason}\n\n요청 산출물:\n${selectedOutputs.map((o) => `- ${o?.title}: ${o?.desc}`).join('\n')}\n\n역할:\n당신은 제약영업 팀장 리더십 코치입니다.\n\n요청:\n위 판단 흐름을 반영해 선택한 산출물을 작성해 주세요.\n\n조건:\n- ${warning}\n- 사실과 추정을 구분합니다.\n- 팀장이 현장에서 실제로 말할 수 있는 언어로 작성합니다.`;
}

export function validateFlowStep(step: StepKey, draft: Draft) {
  if (step === 'choice' && !draft.firstChoice) return 'A/B 중 하나를 선택해 주세요.';
  if (step === 'reason' && (!draft.reason || draft.opportunities.length === 0 || draft.risks.length === 0)) return '선택 이유, 기회, 위험을 모두 입력해 주세요.';
  if (step === 'second' && (!draft.second || !draft.secondReason)) return '2차 선택과 이유를 입력해 주세요.';
  if (step === 'output' && draft.outputIds.length === 0) return 'AI 산출물을 1개 이상 선택해 주세요.';
  if (step === 'prompt' && !draft.prompt) return '프롬프트를 생성해 주세요.';
  if (step === 'promptReview' && draft.promptChecks.length < promptChecks.length) return '프롬프트 검토 항목을 모두 확인해 주세요.';
  if (step === 'aiPaste' && !draft.aiAnswer) return 'AI 결과를 붙여넣거나 직접 초안을 입력해 주세요.';
  if (step === 'aiReview' && !draft.aiNotes) return 'AI 결과에서 고칠 부분을 입력해 주세요.';
  if (step === 'final' && !draft.finalPlan) return '최종 실행계획을 입력해 주세요.';
  return '';
}
