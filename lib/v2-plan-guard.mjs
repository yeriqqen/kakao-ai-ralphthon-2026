// Structural checks supplement the semantic model review; they do not interpret
// arbitrary natural-language business claims. Rejected plans are never published.
const fictional = { en: /fictional/i, ru: /вымышлен|фиктивн/iu, zh: /虚构/u };
export function hydratePlanReview(review, messages) {
  const sources = new Map(messages.filter(message => message.role === 'user').map(message => [message.id, message.text]));
  const hydrate = refs => (refs || []).map(ref => ({ ...ref, sourceQuote: sources.get(ref.sourceMessageId) || '' }));
  return { ...review, customerFactEvidence: hydrate(review.customerFactEvidence), constraintCoverage: hydrate(review.constraintCoverage) };
}
export function planReviewIssues(plan, review, messages, language) {
  const issues = [];
  if (review?.approved !== true || !Array.isArray(review?.violations) || review.violations.length) issues.push('semantic_review_rejected');
  if (typeof plan?.reply !== 'string' || !plan.reply.trim() || typeof plan.readyToCall !== 'boolean') issues.push('invalid_reply');
  const facts = Array.isArray(plan.customerInfo) ? plan.customerInfo : [];
  const questions = Array.isArray(plan.requiredQuestions) ? plan.requiredQuestions : [];
  const institutions = Array.isArray(plan.institutions) ? plan.institutions : [];
  const sources = new Map(messages.filter(m => m.role === 'user').map(m => [m.id, m.text]));
  const grounded = ref => typeof ref?.sourceQuote === 'string' && ref.sourceQuote.trim() && sources.get(ref.sourceMessageId)?.includes(ref.sourceQuote);
  const factKeys = new Set(facts.map(f => f.key));
  if (!Array.isArray(plan.customerInfo) || facts.some(f => !f.key?.trim() || !f.value?.trim()) || factKeys.size !== facts.length) issues.push('invalid_customer_facts');
  const factEvidence = Array.isArray(review?.customerFactEvidence) ? review.customerFactEvidence : [];
  if (facts.some(f => !factEvidence.some(e => e.key === f.key && grounded(e)))) issues.push('ungrounded_customer_fact');
  if (plan.readyToCall) {
    if (institutions.length < 1 || institutions.length > 2 || institutions.some(i => !i.id?.trim() || !i.reason?.trim() || !fictional[language]?.test(i.name || ''))) issues.push('invalid_fictional_institutions');
    const ids = new Set(questions.map(q => q.id));
    if (!questions.length || questions.length > 8 || ids.size !== questions.length || questions.some(q => !q.id?.trim() || !q.text?.trim() || !q.korean?.trim())) issues.push('invalid_required_questions');
    const coverage = Array.isArray(review?.constraintCoverage) ? review.constraintCoverage : [];
    if (!coverage.length || coverage.some(c => !grounded(c) || !c.constraint?.trim() || !Array.isArray(c.questionIds) || !c.questionIds.length || c.questionIds.some(id => !ids.has(id)))) issues.push('uncovered_customer_constraints');
    if (questions.some(q => !coverage.some(c => c.questionIds?.includes(q.id)))) issues.push('unrequested_required_question');
    if (questions.some(q => !review?.questionMeaningChecks?.some(check => check.questionId === q.id && check.faithful === true))) issues.push('korean_question_mismatch');
  } else if (institutions.length || questions.length) issues.push('premature_plan_fields');
  return [...new Set(issues)];
}

export function summaryOutputIssues(summary, transcripts, language) {
  const issues = [];
  const fields = [summary.text, summary.recommendation, summary.reasoning].filter(value => typeof value === 'string');
  if (['en', 'ru', 'zh'].includes(language) && fields.some(value => /\p{Script=Hangul}/u.test(value))) issues.push('untranslated_korean');
  const ids = transcripts.map(item => item.id).filter(Boolean);
  if (fields.some(value => ids.some(id => value.includes(id)) || /\b(?:item|resp)_[A-Za-z0-9_-]+\b/u.test(value))) issues.push('internal_evidence_id');
  for (const name of ['recommendation', 'reasoning']) if (summary[name]?.length > 30 && summary.text?.includes(summary[name])) issues.push(`duplicated_${name}`);
  return issues;
}
