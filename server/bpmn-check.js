/**
 * Deterministic BPMN 2.0 validation for Favorit.
 *
 * Covers the rules that can be decided from the XML itself: well-formedness,
 * id uniqueness, reference integrity, gateway branching, the "one input per task"
 * rule, DI completeness, Favorit conventions and the geometry of the drawn edges.
 * The result is a list of findings with severity error | warning | info.
 */
import { BpmnModdle } from 'bpmn-moddle';

const TASK_TYPES = new Set([
  'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:SendTask',
  'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask', 'bpmn:CallActivity', 'bpmn:SubProcess'
]);
const EVENT_TYPES = new Set([
  'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent',
  'bpmn:IntermediateCatchEvent', 'bpmn:BoundaryEvent'
]);
const GATEWAY_TYPES = new Set([
  'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway',
  'bpmn:EventBasedGateway', 'bpmn:ComplexGateway'
]);
const SECRET_PATTERN = /(password|passwd|secret|token|bearer|api[_-]?key|eyJ[A-Za-z0-9_-]{12,})/i;
const LATIN_LABEL = /^[A-Za-z0-9_\- .()/:]+$/;

const COLOURS = {
  start: '#d4edda',
  split: '#f8d7da',
  merge: '#fff3cd',
  end: '#e2d5f6'
};

/** Which id convention an element follows: 1 (UC-501 lineage), 2 (descriptive) or 0 (unknown). */
function idVariant(id) {
  if (/^F\d+$/.test(id)) return 1;
  if (/^(Start|UT_|ST_|GW_|End_|CA_|Bnd_)/.test(id)) return 1;
  if (/^Flow_/.test(id)) return 2;
  if (/^(StartEvent_|Task_|Gateway_|EndEvent_|Event_)/.test(id)) return 2;
  return 0;
}

/** Axis aligned segment of a waypoint list: {x1,y1,x2,y2,horizontal,vertical}. */
function segmentsOf(waypoints) {
  const segments = [];
  for (let i = 1; i < waypoints.length; i += 1) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    if (a.x === b.x && a.y === b.y) continue;
    segments.push({
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      horizontal: a.y === b.y,
      vertical: a.x === b.x
    });
  }
  return segments;
}

/** Length of the shared part of two collinear segments. */
function collinearOverlap(a, b) {
  if (a.horizontal && b.horizontal) {
    if (Math.abs(a.y1 - b.y1) > 1) return 0;
    const left = Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2));
    const right = Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2));
    return right - left;
  }
  if (a.vertical && b.vertical) {
    if (Math.abs(a.x1 - b.x1) > 1) return 0;
    const top = Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2));
    const bottom = Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2));
    return bottom - top;
  }
  return 0;
}

/** True when a horizontal and a vertical segment cross each other. */
function crosses(a, b) {
  const horizontal = a.horizontal ? a : b.horizontal ? b : null;
  const vertical = a.horizontal ? b : a;
  if (!horizontal || !vertical.vertical) return false;
  const hx1 = Math.min(horizontal.x1, horizontal.x2);
  const hx2 = Math.max(horizontal.x1, horizontal.x2);
  const vy1 = Math.min(vertical.y1, vertical.y2);
  const vy2 = Math.max(vertical.y1, vertical.y2);
  return vertical.x1 > hx1 && vertical.x1 < hx2 && horizontal.y1 > vy1 && horizontal.y1 < vy2;
}

/** True when the inner rectangle lies inside the outer one. */
function contains(outer, inner) {
  return inner.x >= outer.x - 1
    && inner.y >= outer.y - 1
    && inner.x + inner.width <= outer.x + outer.width + 1
    && inner.y + inner.height <= outer.y + outer.height + 1;
}

/** True when a segment runs through a node box. */function hitsBox(segment, box) {
  if (!segment.horizontal && !segment.vertical) return false;
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const bottom = box.y + box.height;
  if (segment.horizontal) {
    const y = segment.y1;
    if (y <= top + 2 || y >= bottom - 2) return false;
    const x1 = Math.min(segment.x1, segment.x2);
    const x2 = Math.max(segment.x1, segment.x2);
    return x2 > left + 2 && x1 < right - 2;
  }
  const x = segment.x1;
  if (x <= left + 2 || x >= right - 2) return false;
  const y1 = Math.min(segment.y1, segment.y2);
  const y2 = Math.max(segment.y1, segment.y2);
  return y2 > top + 2 && y1 < bottom - 2;
}

/**
 * Checks a BPMN file.
 * @returns {{status: string, summary: object, findings: Array<object>}}
 */
export async function checkBpmnXml(xml) {
  const findings = [];
  const add = (severity, element, message, fix) => findings.push({ severity, element, message, fix });

  if (typeof xml !== 'string' || !xml.trim()) {
    add('error', 'file', 'Файл пуст', 'Передать корректный BPMN 2.0 XML.');
    return report(findings);
  }

  let root;
  try {
    const moddle = new BpmnModdle();
    const parsed = await moddle.fromXML(xml);
    root = parsed.rootElement;
    if (!root || root.$type !== 'bpmn:Definitions') {
      add('error', 'file', 'Корневой элемент не bpmn:definitions', 'Обернуть схему в bpmn:definitions с namespace bpmn2, bpmndi, dc, di.');
      return report(findings);
    }
  } catch (error) {
    add('error', 'file', `XML не разбирается: ${error.message}`, 'Исправить синтаксис XML.');
    return report(findings);
  }

  // --- ids ---------------------------------------------------------------
  const ids = new Map();
  for (const match of xml.matchAll(/\bid="([^"]+)"/g)) {
    ids.set(match[1], (ids.get(match[1]) ?? 0) + 1);
  }
  for (const [id, count] of ids) {
    if (count > 1) add('error', id, `id встречается ${count} раза`, 'Переименовать элемент, id должны быть уникальны.');
  }

  const processes = (root.rootElements ?? []).filter((el) => el.$type === 'bpmn:Process');
  const collaborations = (root.rootElements ?? []).filter((el) => el.$type === 'bpmn:Collaboration');
  if (processes.length === 0) add('error', 'file', 'Нет bpmn:process', 'Добавить процесс со схемой.');
  if (collaborations.length === 0) add('warning', 'file', 'Нет bpmn:collaboration', 'Добавить collaboration с участником пула.');

  const nodes = new Map();
  const flows = [];
  const lanes = [];
  for (const process of processes) {
    for (const element of process.flowElements ?? []) {
      if (element.$type === 'bpmn:SequenceFlow') flows.push(element);
      else if (TASK_TYPES.has(element.$type) || EVENT_TYPES.has(element.$type) || GATEWAY_TYPES.has(element.$type)) {
        nodes.set(element.id, element);
      }
    }
    for (const laneSet of process.laneSets ?? []) {
      for (const lane of laneSet.lanes ?? []) lanes.push(lane);
    }
  }

  // --- references --------------------------------------------------------
  for (const flow of flows) {
    const source = flow.sourceRef?.id;
    const target = flow.targetRef?.id;
    if (!source || !nodes.has(source)) add('error', flow.id, `sourceRef «${source ?? '—'}» не найден`, 'Указать существующий узел-источник.');
    if (!target || !nodes.has(target)) add('error', flow.id, `targetRef «${target ?? '—'}» не найден`, 'Указать существующий узел-цель.');
  }

  const outgoingOf = new Map();
  const incomingOf = new Map();
  for (const flow of flows) {
    if (!flow.sourceRef?.id || !flow.targetRef?.id) continue;
    if (!outgoingOf.has(flow.sourceRef.id)) outgoingOf.set(flow.sourceRef.id, []);
    if (!incomingOf.has(flow.targetRef.id)) incomingOf.set(flow.targetRef.id, []);
    outgoingOf.get(flow.sourceRef.id).push(flow);
    incomingOf.get(flow.targetRef.id).push(flow);
  }

  for (const node of nodes.values()) {
    const declaredIn = (node.incoming ?? []).map((ref) => ref.id ?? ref);
    const declaredOut = (node.outgoing ?? []).map((ref) => ref.id ?? ref);
    const actualIn = (incomingOf.get(node.id) ?? []).map((flow) => flow.id);
    const actualOut = (outgoingOf.get(node.id) ?? []).map((flow) => flow.id);
    if (declaredIn.length > 0) {
      for (const id of declaredIn) {
        if (!actualIn.includes(id)) add('error', node.id, `incoming «${id}» не совпадает с потоками схемы`, 'Привести incoming в соответствие с sequenceFlow.');
      }
    }
    if (declaredOut.length > 0) {
      for (const id of declaredOut) {
        if (!actualOut.includes(id)) add('error', node.id, `outgoing «${id}» не совпадает с потоками схемы`, 'Привести outgoing в соответствие с sequenceFlow.');
      }
    }
    for (const id of actualIn) {
      if (declaredIn.length > 0 && !declaredIn.includes(id)) add('error', node.id, `входящий поток «${id}» не указан в incoming`, 'Дописать bpmn:incoming.');
    }
    for (const id of actualOut) {
      if (declaredOut.length > 0 && !declaredOut.includes(id)) add('error', node.id, `исходящий поток «${id}» не указан в outgoing`, 'Дописать bpmn:outgoing.');
    }
  }

  // --- lanes -------------------------------------------------------------
  const laneMembers = new Map();
  const laneCount = new Map();
  for (const lane of lanes) {
    for (const ref of lane.flowNodeRef ?? []) {
      const id = ref.id ?? ref;
      if (!nodes.has(id)) {
        add('error', lane.id, `flowNodeRef «${id}» не найден`, 'Убрать ссылку или добавить узел.');
        continue;
      }
      laneMembers.set(id, lane.id);
      laneCount.set(id, (laneCount.get(id) ?? 0) + 1);
    }
  }
  for (const [id, count] of laneCount) {
    if (count > 1) add('error', id, `узел указан в ${count} дорожках`, 'Оставить узел ровно в одной дорожке.');
  }
  if (lanes.length > 0) {
    for (const id of nodes.keys()) {
      if (!laneMembers.has(id)) add('error', id, 'узел не входит ни в одну дорожку', 'Добавить узел в flowNodeRef дорожки.');
    }
  }

  // --- gateways ----------------------------------------------------------
  for (const node of nodes.values()) {
    if (!GATEWAY_TYPES.has(node.$type)) continue;
    const outgoing = outgoingOf.get(node.id) ?? [];
    const incoming = incomingOf.get(node.id) ?? [];
    const isMerge = incoming.length > 1 && outgoing.length === 1;
    if (outgoing.length === 1 && incoming.length <= 1) {
      add('warning', node.id, 'шлюз имеет один исходящий поток', 'Убрать шлюз или добавить вторую ветвь.');
    }
    if (isMerge) continue;
    if (outgoing.length < 2) {
      add('warning', node.id, `шлюз имеет ${outgoing.length} исходящих потоков`, 'Добавить ветви или заменить шлюз прямой связкой.');
      continue;
    }
    for (const flow of outgoing) {
      if (!flow.name || !flow.name.trim()) {
        add('warning', flow.id, `исходящий поток шлюза ${node.id} без подписи`, 'Подписать поток «да»/«нет» или описанием.');
      }
    }
  }

  // --- one input per task ------------------------------------------------
  for (const node of nodes.values()) {
    if (!TASK_TYPES.has(node.$type)) continue;
    const incoming = incomingOf.get(node.id) ?? [];
    if (incoming.length > 1) {
      add('error', node.id, `у задачи ${incoming.length} входящих потоков без merge-шлюза`, 'Свести потоки через exclusiveGateway (merge) перед задачей.');
    }
    if (incoming.length === 0 && node.$type !== 'bpmn:Task') {
      add('error', node.id, 'задача недостижима: входящих потоков нет', 'Добавить входящий поток или merge-шлюз.');
    }
  }

  // --- Favorit conventions ----------------------------------------------
  const participants = collaborations.flatMap((collab) => collab.participants ?? []);
  if (participants.length > 1) {
    add('error', 'collaboration', `пулов несколько: ${participants.length}`, 'Оставить один пул, роли вынести в дорожки.');
  }
  for (const participant of participants) {
    if (!participant.processRef) add('error', participant.id, 'у участника нет processRef', 'Связать участника с процессом.');
  }
  for (const process of processes) {
    if (process.isExecutable === true) add('error', process.id, 'isExecutable="true"', 'Поставить isExecutable="false".');
    if (process.isExecutable === undefined) add('warning', process.id, 'нет isExecutable', 'Добавить isExecutable="false".');
  }
  for (const participant of participants) {
    const name = participant.name ?? '';
    if (!/^UC-?\d/i.test(name)) {
      add('warning', participant.id, `имя пула «${name}» не вида «UC-N. Название»`, 'Переименовать пул в «UC-N. Название сценария».');
    }
  }

  const variants = new Set();
  for (const id of [...nodes.keys(), ...flows.map((flow) => flow.id)]) {
    const variant = idVariant(id);
    if (variant) variants.add(variant);
  }
  if (variants.size > 1) {
    add('error', 'file', 'смешаны конвенции ID варианта 1 и варианта 2', 'Привести все id к одному варианту.');
  }

  for (const node of nodes.values()) {
    const name = node.name ?? '';
    if (name && LATIN_LABEL.test(name) && !/[А-Яа-яЁё]/.test(name)) {
      add('warning', node.id, `подпись «${name}» не на русском языке`, 'Перевести подпись узла на русский.');
    }
    if (SECRET_PATTERN.test(name)) add('error', node.id, 'в подписи есть признак секрета или токена', 'Убрать секретные данные из подписи.');
  }
  for (const flow of flows) {
    if (SECRET_PATTERN.test(flow.name ?? '')) add('error', flow.id, 'в подписи потока есть признак секрета или токена', 'Убрать секретные данные из подписи.');
  }

  // --- DI ----------------------------------------------------------------
  const planes = (root.diagrams ?? []).map((diagram) => diagram.plane).filter(Boolean);
  const shapes = new Map();
  const edges = new Map();
  for (const plane of planes) {
    for (const element of plane.planeElement ?? []) {
      if (element.$type === 'bpmndi:BPMNShape') shapes.set(element.bpmnElement?.id, element);
      if (element.$type === 'bpmndi:BPMNEdge') edges.set(element.bpmnElement?.id, element);
    }
  }

  for (const node of nodes.values()) {
    const shape = shapes.get(node.id);
    if (!shape) {
      add('error', node.id, 'нет BPMNShape в DI-секции', 'Сгенерировать DI: node server/bpmn-layout.js.');
      continue;
    }
    const bounds = shape.bounds;
    if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) {
      add('error', node.id, 'у BPMNShape некорректные dc:Bounds', 'Сгенерировать DI заново.');
    }
  }
  for (const flow of flows) {
    const edge = edges.get(flow.id);
    if (!edge) {
      add('error', flow.id, 'нет BPMNEdge в DI-секции', 'Сгенерировать DI: node server/bpmn-layout.js.');
      continue;
    }
    if ((edge.waypoint ?? []).length < 2) {
      add('error', flow.id, 'у BPMNEdge меньше двух di:waypoint', 'Сгенерировать DI заново.');
    }
  }
  const diTargets = new Set(nodes.keys());
  for (const lane of lanes) diTargets.add(lane.id);
  for (const participant of participants) diTargets.add(participant.id);
  for (const id of shapes.keys()) {
    if (!diTargets.has(id)) add('warning', id, 'BPMNShape без узла в semantic-секции', 'Удалить лишний shape.');
  }
  for (const id of edges.keys()) {
    if (!flows.some((flow) => flow.id === id)) add('warning', id, 'BPMNEdge без потока в semantic-секции', 'Удалить лишний edge.');
  }

  // --- geometry ----------------------------------------------------------
  // Lanes and the pool are containers: an edge is expected to run inside them.
  const boxes = [];
  for (const [id, shape] of shapes) {
    if (shape.bounds && nodes.has(id)) boxes.push({ id, ...shape.bounds });
  }

  const poolBounds = [...shapes.values()]
    .filter((shape) => participants.some((participant) => participant.id === shape.bpmnElement?.id))
    .map((shape) => shape.bounds)
    .filter(Boolean);
  for (const node of nodes.values()) {
    const shape = shapes.get(node.id);
    if (!shape?.bounds) continue;
    const laneId = laneMembers.get(node.id);
    const laneShape = laneId ? shapes.get(laneId) : null;
    if (laneShape?.bounds && !contains(laneShape.bounds, shape.bounds)) {
      add('error', node.id, 'блок узла выходит за границы дорожки', 'Пересобрать DI: node server/bpmn-layout.js.');
    }
    if (poolBounds.length > 0 && !poolBounds.some((pool) => contains(pool, shape.bounds))) {
      add('error', node.id, 'блок узла вне границ пула', 'Пересобрать DI: node server/bpmn-layout.js.');
    }
  }

  const edgeList = flows
    .map((flow) => ({ id: flow.id, edge: edges.get(flow.id) }))
    .filter((item) => item.edge?.waypoint?.length >= 2);

  for (let i = 0; i < edgeList.length; i += 1) {
    for (let j = i + 1; j < edgeList.length; j += 1) {
      const a = edgeList[i];
      const b = edgeList[j];
      const segmentsA = segmentsOf(a.edge.waypoint);
      const segmentsB = segmentsOf(b.edge.waypoint);
      let worst = 0;
      let worstPair = null;
      for (const sa of segmentsA) {
        for (const sb of segmentsB) {
          const overlap = collinearOverlap(sa, sb);
          if (overlap > worst) {
            worst = overlap;
            worstPair = [sa, sb];
          }
        }
      }
      if (worst > 2) {
        add('error', `${a.id} / ${b.id}`,
          `линии потоков лежат друг на друге (${Math.round(worst)} px)`,
          'Пересобрать DI: node server/bpmn-layout.js.');
      }
    }
  }

  for (const item of edgeList) {
    for (const segment of segmentsOf(item.edge.waypoint)) {
      for (const box of boxes) {
        if (hitsBox(segment, box)) {
          add('warning', item.id, `линия проходит через блок «${box.id}»`, 'Пересобрать DI: node server/bpmn-layout.js.');
          break;
        }
      }
    }
  }

  return report(findings);
}

function report(findings) {
  const summary = {
    error: findings.filter((item) => item.severity === 'error').length,
    warning: findings.filter((item) => item.severity === 'warning').length,
    info: findings.filter((item) => item.severity === 'info').length
  };
  const status = summary.error > 0 ? 'invalid' : summary.warning > 0 ? 'warnings' : 'ok';
  return { status, summary, findings };
}

/** Markdown report in the format of the bpmn-validator agent. */
export function formatReport(result) {
  const title = { ok: '✅ корректен', warnings: '⚠️ есть замечания', invalid: '❌ невалиден' }[result.status];
  const lines = [
    '## Отчёт валидации BPMN',
    `**Статус:** ${title}`,
    `**Итог:** ${result.summary.error} ошибок, ${result.summary.warning} предупреждений, ${result.summary.info} замечаний`,
    ''
  ];

  for (const severity of ['error', 'warning', 'info']) {
    const items = result.findings.filter((item) => item.severity === severity);
    if (items.length === 0) continue;
    const heading = { error: 'Ошибки (error)', warning: 'Предупреждения (warning)', info: 'Замечания (info)' }[severity];
    lines.push(`### ${heading}`, '| # | Элемент | Проблема | Исправление |', '|---|---------|----------|-------------|');
    items.slice(0, 50).forEach((item, index) => {
      lines.push(`| ${index + 1} | \`${item.element}\` | ${item.message} | ${item.fix} |`);
    });
    if (items.length > 50) lines.push(`| … | | ещё ${items.length - 50} замечаний этого уровня | |`);
    lines.push('');
  }

  return lines.join('\n');
}

export const internals = { idVariant, collinearOverlap, crosses, hitsBox, segmentsOf };
