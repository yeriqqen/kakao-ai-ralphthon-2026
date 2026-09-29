// Presentation only: answers were already extracted by AI and grounded against
// actual business transcript evidence. No business facts are authored here.
const labels = {
  en: { simulation: 'Fictional simulation only — no real call or booking.', outcome: 'Call outcome', completed: 'Simulation completed.', incomplete: 'Simulation ended incompletely.', active: 'Simulation not yet completed.', facts: 'Validated business answers in this simulation', customer: 'Customer-provided information', unresolved: 'Still unresolved', noFacts: 'No validated business answers were retained.', noCustomer: 'No customer details were retained.', none: 'No required questions remain unresolved.', hiddenQuestion: 'A question could not be displayed in the selected language.', hiddenCustomer: 'Some customer details could not be displayed in the selected language.', noRecommendation: 'A grounded recommendation is unavailable for this run.', noReasoning: 'Review the recorded facts and unresolved questions before choosing a next step.', age: 'Age', symptoms: 'Symptoms', duration: 'Duration', urgency: 'Urgency', location: 'Location', time: 'Preferred time', doctor: 'Doctor preference', insurance: 'Insurance', payment: 'Payment or cost inquiry', visit: 'Prior-visit information', detail: 'Detail' },
  ru: { simulation: 'Только вымышленная симуляция — реального звонка или записи нет.', outcome: 'Результат разговора', completed: 'Симуляция завершена.', incomplete: 'Симуляция завершилась не полностью.', active: 'Симуляция ещё не завершена.', facts: 'Подтверждённые ответы вымышленной организации', customer: 'Информация от клиента', unresolved: 'Осталось уточнить', noFacts: 'Подтверждённые ответы организации не сохранены.', noCustomer: 'Данные клиента не сохранены.', none: 'Все обязательные вопросы разрешены.', hiddenQuestion: 'Один вопрос не удалось отобразить на выбранном языке.', hiddenCustomer: 'Некоторые данные клиента не удалось отобразить на выбранном языке.', noRecommendation: 'Обоснованная рекомендация для этой попытки недоступна.', noReasoning: 'Перед выбором следующего шага ознакомьтесь с сохранёнными фактами и нерешёнными вопросами.', age: 'Возраст', symptoms: 'Симптомы', duration: 'Продолжительность', urgency: 'Срочность', location: 'Местоположение', time: 'Предпочтительное время', doctor: 'Предпочтение врача', insurance: 'Страховка', payment: 'Оплата или стоимость', visit: 'Предыдущие посещения', detail: 'Сведения' },
  zh: { simulation: '仅为虚构模拟，没有实际通话或预约。', outcome: '通话结果', completed: '模拟已完成。', incomplete: '模拟未完整完成。', active: '模拟尚未完成。', facts: '本次模拟中已核实的机构答复', customer: '客户提供的信息', unresolved: '仍待确认', noFacts: '尚无已核实并保留的机构答复。', noCustomer: '尚无保留的客户信息。', none: '所有必要问题均已解决。', hiddenQuestion: '有一个问题暂时无法以所选语言显示。', hiddenCustomer: '部分客户信息暂时无法以所选语言显示。', noRecommendation: '本次暂时无法提供有依据的建议。', noReasoning: '选择下一步前，请查看已记录的事实及仍待确认的问题。', age: '年龄', symptoms: '症状', duration: '持续时间', urgency: '紧急程度', location: '所在地区', time: '希望就诊时间', doctor: '医生偏好', insurance: '医疗保险', payment: '付款或费用咨询', visit: '既往就诊情况', detail: '信息' },
};
function customerLabel(key, strings) {
  if (key === 'age') return strings.age;
  if (/duration/.test(key)) return strings.duration;
  if (/symptom/.test(key)) return strings.symptoms;
  if (/urgency|urgent|emergency/.test(key)) return strings.urgency;
  if (/location|region/.test(key)) return strings.location;
  if (/time/.test(key)) return strings.time;
  if (/doctor.*gender|gender.*doctor|doctor_preference|preferred_doctor|^gender_preference$/.test(key)) return strings.doctor;
  if (/insurance/.test(key)) return strings.insurance;
  if (/payment|cost|price/.test(key)) return strings.payment;
  if (/first_visit|prior_visit|previous_visit/.test(key)) return strings.visit;
  return strings.detail;
}
export function factualSummary(room) {
  const strings = labels[room.language] || labels.en;
  const transcripts = (room.transcripts || []).filter(item => item.callId === room.call.id);
  const sourceIds = transcripts.map(item => item.id).filter(Boolean);
  const safe = value => typeof value === 'string' && value.trim() && !/\p{Script=Hangul}/u.test(value) && !sourceIds.some(id => value.includes(id)) && !/\b(?:item|resp)_[A-Za-z0-9_-]+\b/u.test(value);
  const supported = question => question.status === 'resolved' && safe(question.answer) && question.evidence?.length && question.evidence.every(ref => ref.quote?.trim() && transcripts.some(item => item.id === ref.transcriptId && item.role === 'business' && item.text.includes(ref.quote)));
  const answers = [], unresolved = [];
  for (const question of room.requiredQuestions || []) {
    const text = safe(question.text) ? question.text : strings.hiddenQuestion;
    if (supported(question) && safe(question.text)) answers.push({ id: question.id, text, answer: question.answer });
    else unresolved.push({ id: question.id, text });
  }
  const customerInfo = (room.customerInfo || []).filter(info => safe(info.value)).map(info => ({ key: info.key, value: info.value }));
  const customerLines = customerInfo.map(info => `- ${customerLabel(info.key || '', strings)}: ${info.value}`);
  if (customerInfo.length !== (room.customerInfo || []).length) customerLines.push(`- ${strings.hiddenCustomer}`);
  const outcome = room.call.status === 'completed' ? strings.completed : ['interrupted', 'failed'].includes(room.call.status) ? strings.incomplete : strings.active;
  const text = [
    strings.simulation,
    `${strings.outcome}: ${outcome}`,
    `${strings.facts}:\n${answers.length ? answers.map(item => `- ${item.text}\n  ${item.answer}`).join('\n') : strings.noFacts}`,
    `${strings.customer}:\n${customerLines.length ? customerLines.join('\n') : strings.noCustomer}`,
    `${strings.unresolved}:\n${unresolved.length ? unresolved.map(item => `- ${item.text}`).join('\n') : strings.none}`,
  ].join('\n\n');
  const institution = (room.institutions || []).find(item => item.id === room.call.institutionId);
  return { text, answers, unresolved, customerInfo, institution: institution ? { id: institution.id, name: safe(institution.name) ? institution.name : null, fictional: true } : null, strings };
}

const adviceLabels = {
  en: { review_recorded_answers: 'In this simulation, consider this option based on the recorded answers.', clarify_selected_questions: 'Clarify the selected questions before choosing a simulated option.', try_another_simulated_option: 'Try another fictional option in the simulation.', insufficient_information: 'There is not enough information to recommend a simulated option yet.', reasons: 'Selected recorded answers', clarify: 'Questions to clarify', noEvidence: 'No validated business answers are available for a recommendation.' },
  ru: { review_recorded_answers: 'В этой симуляции рассмотрите этот вариант на основе сохранённых ответов.', clarify_selected_questions: 'Уточните выбранные вопросы, прежде чем выбирать вариант в симуляции.', try_another_simulated_option: 'Попробуйте другой вымышленный вариант в симуляции.', insufficient_information: 'Пока недостаточно информации, чтобы рекомендовать вариант в симуляции.', reasons: 'Выбранные сохранённые ответы', clarify: 'Вопросы для уточнения', noEvidence: 'Для рекомендации пока нет подтверждённых ответов организации.' },
  zh: { review_recorded_answers: '在本次模拟中，可根据已记录的答复考虑这个选项。', clarify_selected_questions: '先确认所选问题，再选择模拟选项。', try_another_simulated_option: '在模拟中尝试另一个虚构选项。', insufficient_information: '目前信息不足，尚无法推荐模拟选项。', reasons: '所选的已记录答复', clarify: '需要确认的问题', noEvidence: '目前没有可用于建议的已核实机构答复。' },
};

export function renderAdviceChoice(facts, decision, language) {
  const strings = adviceLabels[language] || adviceLabels.en;
  const reasons = decision?.reasonQuestionIds, clarifications = decision?.clarificationQuestionIds;
  const fail = () => { throw Object.assign(new Error('Invalid grounded recommendation choice.'), { code: 'INVALID_ADVICE_CHOICE' }); };
  if (!Array.isArray(reasons) || !Array.isArray(clarifications) || !Object.hasOwn(strings, decision.action) || ['reasons', 'clarify', 'noEvidence'].includes(decision.action)) fail();
  if (new Set(reasons).size !== reasons.length || new Set(clarifications).size !== clarifications.length) fail();
  if (reasons.some(id => !facts.answers.some(item => item.id === id)) || clarifications.some(id => !facts.unresolved.some(item => item.id === id))) fail();
  if (decision.action === 'review_recorded_answers' && (facts.unresolved.length || !reasons.length || clarifications.length)) fail();
  if (decision.action === 'try_another_simulated_option' && (!reasons.length || clarifications.length)) fail();
  if (decision.action === 'clarify_selected_questions' && !clarifications.length) fail();
  if (decision.action === 'insufficient_information' && (facts.answers.length && !facts.unresolved.length || facts.unresolved.length && !clarifications.length)) fail();
  const selected = reasons.map(id => facts.answers.find(item => item.id === id));
  const remaining = clarifications.map(id => facts.unresolved.find(item => item.id === id));
  const sections = [];
  if (selected.length) sections.push(`${strings.reasons}:\n${selected.map(item => `- ${item.text}\n  ${item.answer}`).join('\n')}`);
  if (remaining.length) sections.push(`${strings.clarify}:\n${remaining.map(item => `- ${item.text}`).join('\n')}`);
  return { recommendation: strings[decision.action], reasoning: sections.join('\n\n') || strings.noEvidence };
}
