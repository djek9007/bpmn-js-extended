/**
 * BPMN DI layout for Favorit.
 *
 * Takes a BPMN 2.0 file (semantic section required, DI optional) and produces the
 * same file with a complete DI section: pool, lanes, node boxes and orthogonal
 * sequence-flow routes that do not overlap each other or run through node boxes.
 *
 * The semantic section is never rewritten — the generated DI is spliced into the
 * original XML text.
 */
import { BpmnModdle } from 'bpmn-moddle';

const POOL_X = 30;
const POOL_Y = 50;
const POOL_PAD = 30;
const POOL_GAP = 40;
const LANE_PAD = 30;
const COL_GAP = 70;
const STACK_GAP = 24;
const STUB = 12;
const TRACK_STEP = 8;
const TRACK_RANGE = 240;
const EDGE_CLEARANCE = 20;
const LABEL_HEIGHT = 14;

const PALETTE = {
  start: { fill: '#d4edda', stroke: '#28a745' },
  user: { fill: '#cce5ff', stroke: '#0d6efd' },
  service: { fill: '#e9ecef', stroke: '#495057' },
  split: { fill: '#f8d7da', stroke: '#dc3545' },
  merge: { fill: '#fff3cd', stroke: '#ffc107' },
  end: { fill: '#e2d5f6', stroke: '#6f42c1' }
};

const EVENT_TYPES = new Set([
  'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:BoundaryEvent',
  'bpmn:IntermediateThrowEvent', 'bpmn:IntermediateCatchEvent'
]);
const GATEWAY_TYPES = new Set([
  'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway',
  'bpmn:EventBasedGateway', 'bpmn:ComplexGateway'
]);
const TASK_TYPES = new Set([
  'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:SendTask',
  'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask', 'bpmn:CallActivity', 'bpmn:SubProcess'
]);
const ANNOTATION_TYPES = new Set(['bpmn:TextAnnotation']);
const DATA_TYPES = new Set(['bpmn:DataObject', 'bpmn:DataObjectReference', 'bpmn:DataStoreReference']);

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const round = (value) => Math.round(value * 10) / 10;

/** Rough text width of a Russian label in bpmn-js (12px sans-serif). */
const textWidth = (text = '') => String(text).length * 7.2;

/** Node box size derived from the element type and its label. */
function nodeSize(element) {
  const type = element.$type;
  const name = element.name ?? '';

  if (EVENT_TYPES.has(type)) return { width: 36, height: 36 };
  if (GATEWAY_TYPES.has(type)) return { width: 50, height: 50 };
  if (TASK_TYPES.has(type)) {
    // Widen the box so the text fits without overflowing; keep 80px height.
    const lines = Math.max(1, Math.ceil(String(name).length / 3));
    const width = Math.min(280, Math.max(140, Math.ceil((lines * 7.2 + 4) * 3)));
    return { width, height: 80 };
  }
  if (ANNOTATION_TYPES.has(type)) {
    return { width: Math.min(520, Math.max(200, textWidth(name) + 20)), height: 100 };
  }
  if (DATA_TYPES.has(type)) return { width: 36, height: 50 };
  return { width: 100, height: 80 };
}

function isFlowNode(element) {
  return EVENT_TYPES.has(element.$type)
    || GATEWAY_TYPES.has(element.$type)
    || TASK_TYPES.has(element.$type);
}

/** Collects participants (pools), their lanes and the flow nodes inside them. */
function collectStructure(rootElement) {
  const collaborations = (rootElement.rootElements ?? []).filter((el) => el.$type === 'bpmn:Collaboration');
  const participants = [];

  for (const collaboration of collaborations) {
    for (const participant of collaboration.participants ?? []) {
      const process = participant.processRef;
      const lanes = [];
      const laneSets = process?.laneSets ?? [];

      for (const laneSet of laneSets) {
        for (const lane of laneSet.lanes ?? []) {
          lanes.push({
            id: lane.id,
            name: lane.name ?? '',
            nodeIds: (lane.flowNodeRef ?? []).map((ref) => ref.id)
          });
        }
      }

      const flowElements = process?.flowElements ?? [];
      const nodes = flowElements.filter(isFlowNode).map((element) => ({
        id: element.id,
        name: element.name ?? '',
        type: element.$type,
        element
      }));
      const flows = flowElements
        .filter((el) => el.$type === 'bpmn:SequenceFlow')
        .map((flow) => ({
          id: flow.id,
          name: flow.name ?? '',
          source: flow.sourceRef?.id,
          target: flow.targetRef?.id
        }))
        .filter((flow) => flow.source && flow.target);
      const annotations = flowElements
        .filter((el) => ANNOTATION_TYPES.has(el.$type))
        .map((annotation) => ({
          id: annotation.id,
          name: annotation.text ?? annotation.name ?? '',
          type: annotation.$type,
          element: annotation
        }));

      participants.push({
        id: participant.id,
        name: participant.name ?? '',
        collaborationId: collaboration.id,
        processId: process?.id,
        lanes,
        nodes,
        flows,
        annotations
      });
    }
  }

  return { collaborations, participants };
}

/** Builds a participant-like view of a process that has no pool of its own. */
function implicitParticipant(process) {
  const flowElements = process.flowElements ?? [];
  return {
    id: process.id,
    name: process.name ?? '',
    collaborationId: null,
    processId: process.id,
    lanes: [],
    nodes: flowElements.filter(isFlowNode).map((element) => ({
      id: element.id,
      name: element.name ?? '',
      type: element.$type,
      element
    })),
    flows: flowElements
      .filter((el) => el.$type === 'bpmn:SequenceFlow')
      .map((flow) => ({
        id: flow.id,
        name: flow.name ?? '',
        source: flow.sourceRef?.id,
        target: flow.targetRef?.id
      }))
      .filter((flow) => flow.source && flow.target),
    annotations: []
  };
}

/**
 * Longest-path layering. Edges that close a cycle are ignored for ranking,
 * they are routed as loops later.
 */
function computeRanks(nodes, flows) {
  const ids = nodes.map((node) => node.id);
  const outgoing = new Map(ids.map((id) => [id, []]));
  const incoming = new Map(ids.map((id) => [id, []]));

  for (const flow of flows) {
    if (!outgoing.has(flow.source) || !incoming.has(flow.target)) continue;
    outgoing.get(flow.source).push(flow);
    incoming.get(flow.target).push(flow);
  }

  const state = new Map();
  const backEdges = new Set();
  const postOrder = [];

  const visit = (id) => {
    state.set(id, 1);
    for (const flow of outgoing.get(id) ?? []) {
      const targetState = state.get(flow.target) ?? 0;
      if (targetState === 1) backEdges.add(flow.id);
      else if (targetState === 0) visit(flow.target);
    }
    state.set(id, 2);
    postOrder.push(id);
  };

  for (const id of ids) if (!state.get(id)) visit(id);

  const rank = new Map(ids.map((id) => [id, 0]));
  for (const id of [...postOrder].reverse()) {
    for (const flow of outgoing.get(id) ?? []) {
      if (backEdges.has(flow.id)) continue;
      rank.set(flow.target, Math.max(rank.get(flow.target), rank.get(id) + 1));
    }
  }

  return { rank, backEdges, outgoing, incoming };
}

/** Assigns x/column to every node and returns the column layout. */
function assignColumns(nodes, rank) {
  const columns = new Map();
  for (const node of nodes) {
    const column = rank.get(node.id) ?? 0;
    if (!columns.has(column)) columns.set(column, []);
    columns.get(column).push(node);
  }

  const columnWidth = new Map();
  for (const [column, members] of columns) {
    columnWidth.set(column, Math.max(...members.map((node) => node.width)));
  }

  const columnX = new Map();
  let x = POOL_X + POOL_PAD + 60;
  for (const column of [...columns.keys()].sort((a, b) => a - b)) {
    columnX.set(column, x);
    x += columnWidth.get(column) + COL_GAP;
  }

  return { columns, columnWidth, columnX, contentRight: x - COL_GAP };
}

/** Stacks nodes that share a lane and a column, then sizes the lane. */
function assignLanes(participant, nodes, rank, columnX, poolTop) {
  const lanes = participant.lanes.map((lane) => ({ ...lane, members: [] }));
  const laneByNodeId = new Map();

  for (const lane of lanes) {
    for (const nodeId of lane.nodeIds) laneByNodeId.set(nodeId, lane);
  }

  const unassigned = nodes.filter((node) => !laneByNodeId.has(node.id));
  if (unassigned.length) {
    const lane = { id: `${participant.id}_LaneUnassigned`, name: 'Без дорожки', nodeIds: [], members: [] };
    lanes.push(lane);
    for (const node of unassigned) laneByNodeId.set(node.id, lane);
  }

  // Group the nodes of every lane by column.
  for (const node of nodes) {
    const lane = laneByNodeId.get(node.id);
    const column = rank.get(node.id) ?? 0;
    let group = lane.members.find((entry) => entry.column === column);
    if (!group) {
      group = { column, nodes: [] };
      lane.members.push(group);
    }
    group.nodes.push(node);
  }

  for (const lane of lanes) {
    lane.members.sort((a, b) => a.column - b.column);
    for (const group of lane.members) {
      group.height = group.nodes.reduce((sum, node) => sum + node.height, 0)
        + STACK_GAP * (group.nodes.length - 1);
    }
    lane.contentHeight = Math.max(0, ...lane.members.map((group) => group.height));
    lane.height = Math.max(120, lane.contentHeight + 2 * LANE_PAD);
  }

  // Absolute y of every lane and of every node inside it.
  let laneY = poolTop;
  for (const lane of lanes) {
    lane.y = laneY;
    for (const group of lane.members) {
      let offset = lane.y + (lane.height - group.height) / 2;
      for (const node of group.nodes) {
        node.x = columnX.get(group.column);
        node.y = offset;
        offset += node.height + STACK_GAP;
      }
    }
    laneY += lane.height;
  }

  return { lanes, laneByNodeId, height: laneY - poolTop };
}

/** True when the vertical segment (x, y1..y2) cuts through a node box. */
function verticalHitsNode(x, y1, y2, nodes, ignoreIds) {
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);

  return nodes.some((node) => {
    if (ignoreIds.has(node.id)) return false;
    if (x < node.x + 4 || x > node.x + node.width - 4) return false;
    return top < node.y + node.height - 2 && bottom > node.y + 2;
  });
}

/** True when the horizontal segment (y, x1..x2) cuts through a node box. */
function horizontalHitsNode(x1, x2, y, nodes, ignoreIds) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);

  return nodes.some((node) => {
    if (ignoreIds.has(node.id)) return false;
    if (y < node.y + 4 || y > node.y + node.height - 4) return false;
    return left < node.x + node.width - 2 && right > node.x + 2;
  });
}

/** True when two edges already use the same vertical line over the same height. */
function verticalConflicts(x, y1, y2, usedVerticals) {
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);

  return usedVerticals.some((used) => {
    if (Math.abs(used.x - x) > 1) return false;
    return top < used.bottom && bottom > used.top;
  });
}

/**
 * Routes every sequence flow.
 *
 * A forward flow leaves the source on its right edge and enters the target on
 * its left edge. When several flows share one node, each of them gets its own
 * exit/entry point: the flow first moves diagonally by a short stub, so the
 * parallel runs end up on different levels and never lie on top of each other.
 * Loop flows run below the pool, each on its own corridor.
 */
function routeFlows(participant, nodes, nodesById, rank, backEdges, outgoing, incoming, poolBottom, poolRight) {
  const routes = [];
  const usedVerticals = [];

  // Rows: nodes whose centre lines are less than one track apart. Every run
  // inside a row gets its own track, so parallel runs never lie on top of each other.
  const rowOf = new Map(nodes.map((node) => [node.id, Math.round((node.y + node.height / 2) / TRACK_STEP)]));
  const runs = [];

  const trackCandidates = (y) => {
    const list = [y];
    for (let step = TRACK_STEP; step <= TRACK_RANGE; step += TRACK_STEP) list.push(y + step, y - step);
    return list;
  };

  const runsOverlap = (a1, a2, b1, b2) => a1 < b2 - 2 && a2 > b1 + 2;

  /** True when no run crosses the same height over the same span. */
  const trackFree = (x1, x2, y) => {
    for (const run of runs) {
      if (!runsOverlap(run.x1, run.x2, x1, x2)) continue;
      if (Math.abs(run.y - y) <= 2) return false;
    }
    return true;
  };

  /** Closest track where the run touches no node and no other run. */
  const pickTrack = (row, span, nodeSpan, preferred, ignore) => {
    const [x1, x2] = span;
    const candidates = trackCandidates(preferred);
    const free = candidates.find((candidate) => trackFree(x1, x2, candidate)
      && !horizontalHitsNode(nodeSpan[0], nodeSpan[1], candidate, nodes, ignore));
    if (free !== undefined) return free;
    // Nothing is free: take the closest track nobody uses, even if it crosses a box.
    const freeOfRuns = candidates.find((candidate) => trackFree(x1, x2, candidate));
    return freeOfRuns ?? preferred;
  };

  const reserveTrack = (span, y) => {
    runs.push({ x1: Math.min(...span), x2: Math.max(...span), y });
  };

  const ordered = [...participant.flows].sort((a, b) => {
    const rankDelta = (rank.get(a.source) ?? 0) - (rank.get(b.source) ?? 0);
    return rankDelta !== 0 ? rankDelta : a.id.localeCompare(b.id);
  });

  /**
   * First candidate whose vertical line is free of nodes and of other edges.
   * When none of them fits, the whole span is scanned for the closest free line.
   */
  const freeVertical = (preferred, span, y1, y2, ignore) => {
    const fits = (candidate) => !verticalHitsNode(candidate, y1, y2, nodes, ignore)
      && !verticalConflicts(candidate, y1, y2, usedVerticals);

    for (const candidate of preferred) if (fits(candidate)) return candidate;

    const [low, high] = span;
    const base = preferred[0];
    for (let delta = 2; delta <= high - low; delta += 2) {
      for (const candidate of [base - delta, base + delta]) {
        if (candidate <= low || candidate >= high) continue;
        if (fits(candidate)) return candidate;
      }
    }
    return base;
  };

  const remember = (x, y1, y2) => {
    usedVerticals.push({ x, top: Math.min(y1, y2), bottom: Math.max(y1, y2) });
  };

  // Column where a flow touches the bottom edge of a node. Several flows of
  // one node get different columns, so their verticals never lie on top of
  // each other.
  const attachSlots = new Map();

  const attachColumn = (node, side) => {
    const key = `${side}:${node.id}`;
    const used = attachSlots.get(key) ?? 0;
    attachSlots.set(key, used + 1);
    const centerX = node.x + node.width / 2;
    const min = node.x + 6;
    const max = node.x + node.width - 6;
    const offset = (used % 8) * 8;
    const direction = Math.floor(used / 8) % 2 === 0 ? 1 : -1;
    return Math.min(max, Math.max(min, Math.round(centerX + direction * offset)));
  };

  /**
   * Vertical run from the bottom edge of a node down to the corridor.
   * When the straight line is blocked, the run steps aside through a free band
   * right under the node, so it never runs through a box.
   */
  const descend = (node, corridorY, ignore, side) => {
    const bottom = node.y + node.height;
    const attachX = attachColumn(node, side);
    const straight = {
      x: attachX,
      points: [{ x: attachX, y: bottom }, { x: attachX, y: corridorY }],
      segments: [{ x: attachX, top: bottom, bottom: corridorY }]
    };

    if (!verticalHitsNode(attachX, bottom, corridorY, nodes, ignore)
      && !verticalConflicts(attachX, bottom, corridorY, usedVerticals)) {
      return straight;
    }

    for (let dx = 4; dx <= poolRight - POOL_X; dx += 4) {
      for (const x of [attachX - dx, attachX + dx]) {
        if (x < POOL_X + POOL_PAD || x > poolRight - 4) continue;
        if (verticalHitsNode(x, bottom, corridorY, nodes, ignore)) continue;
        if (verticalConflicts(x, bottom, corridorY, usedVerticals)) continue;

        for (let dy = 4; dy <= 48; dy += 4) {
          const bandY = bottom + dy;
          if (verticalHitsNode(attachX, bottom, bandY, nodes, ignore)) break;
          if (verticalConflicts(attachX, bottom, bandY, usedVerticals)) break;
          if (horizontalHitsNode(attachX, x, bandY, nodes, ignore)) continue;
          if (!trackFree(Math.min(attachX, x), Math.max(attachX, x), bandY)) continue;
          reserveTrack([attachX, x], bandY);
          return {
            x,
            points: [
              { x: attachX, y: bottom },
              { x: attachX, y: bandY },
              { x, y: bandY },
              { x, y: corridorY }
            ],
            segments: [
              { x: attachX, top: bottom, bottom: bandY },
              { x, top: bandY, bottom: corridorY }
            ]
          };
        }

        if (!trackFree(Math.min(attachX, x), Math.max(attachX, x), bottom)) continue;
        reserveTrack([attachX, x], bottom);
        return {
          x,
          points: [
            { x: attachX, y: bottom },
            { x, y: bottom },
            { x, y: corridorY }
          ],
          segments: [
            { x: attachX, top: bottom, bottom },
            { x, top: bottom, bottom: corridorY }
          ]
        };
      }
    }

    return straight;
  };

  let loopIndex = 0;

  for (const flow of ordered) {
    const source = nodesById.get(flow.source);
    const target = nodesById.get(flow.target);
    if (!source || !target) continue;

    const isLoop = backEdges.has(flow.id) || (rank.get(target.id) ?? 0) <= (rank.get(source.id) ?? 0);

    if (isLoop) {
      const corridorY = poolBottom + 40 + loopIndex * (STACK_GAP + 4);
      loopIndex += 1;
      const ignore = new Set([source.id, target.id]);

      const down = descend(source, corridorY, ignore, 'source');
      for (const segment of down.segments) remember(segment.x, segment.top, segment.bottom);

      const up = descend(target, corridorY, ignore, 'target');
      for (const segment of up.segments) remember(segment.x, segment.top, segment.bottom);

      routes.push({
        flow,
        points: [
          ...down.points,
          { x: up.x, y: corridorY },
          ...up.points.slice(0, -1).reverse()
        ]
      });
      continue;
    }

    const startX = source.x + source.width;
    const startY = source.y + source.height / 2;
    const endX = target.x;
    const endY = target.y + target.height / 2;

    // Mid column between the two nodes; shift it until the vertical line is free.
    const ignore = new Set([source.id, target.id]);
    const candidates = [];
    for (let step = 1; step <= 10; step += 1) {
      const candidate = startX + ((endX - startX) * step) / 11;
      if (candidate >= endX) break;
      candidates.push(candidate);
    }

    const sourceRow = rowOf.get(source.id);
    const targetRow = rowOf.get(target.id);
    const sameRow = sourceRow === targetRow;

    let mid = freeVertical(candidates, [startX + 4, endX - 4], startY, endY, ignore);

    // A flow inside one row owns two runs, so it has to clear the whole span.
    const entrySpan = () => (sameRow ? [startX, endX] : [startX, mid]);
    const entryNodeSpan = () => (sameRow ? [startX + STUB, endX - STUB] : [startX + STUB, mid]);

    let entryTrack = pickTrack(sourceRow, entrySpan(), entryNodeSpan(), startY, ignore);
    let exitTrack = sameRow
      ? entryTrack
      : pickTrack(targetRow, [mid, endX], [mid, endX - STUB], endY, ignore);

    // The chosen tracks may have blocked the vertical: look for another middle.
    if (verticalHitsNode(mid, entryTrack, exitTrack, nodes, ignore)
      || verticalConflicts(mid, entryTrack, exitTrack, usedVerticals)) {
      const retry = freeVertical(candidates, [startX + 4, endX - 4], entryTrack, exitTrack, ignore);
      if (retry !== mid) {
        mid = retry;
        entryTrack = pickTrack(sourceRow, entrySpan(), entryNodeSpan(), startY, ignore);
        exitTrack = sameRow
          ? entryTrack
          : pickTrack(targetRow, [mid, endX], [mid, endX - STUB], endY, ignore);
      }
    }

    reserveTrack([startX, mid], entryTrack);
    reserveTrack([mid, endX], exitTrack);

    remember(mid, entryTrack, exitTrack);

    routes.push({
      flow,
      points: [
        { x: startX, y: startY },
        { x: startX + STUB, y: entryTrack },
        { x: mid, y: entryTrack },
        { x: mid, y: exitTrack },
        { x: endX - STUB, y: exitTrack },
        { x: endX, y: endY }
      ]
    });
  }

  return routes;
}

/** Label bounds for a named flow, placed next to the longest segment. */
function flowLabelBounds(points, name) {
  const width = Math.max(14, textWidth(name) + 6);
  let best = null;

  for (let index = 0; index < points.length - 1; index += 1) {
    const [a, b] = [points[index], points[index + 1]];
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (!best || length > best.length) best = { a, b, length };
  }

  if (!best) return null;
  const x = (best.a.x + best.b.x) / 2 - width / 2;
  const y = (best.a.y + best.b.y) / 2 - LABEL_HEIGHT - 4;
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: LABEL_HEIGHT };
}

/** Favorit colour coding for events, gateways and tasks. */
function shapeColours(node, outgoingCount, incomingCount) {
  if (node.type === 'bpmn:StartEvent') return PALETTE.start;
  if (node.type === 'bpmn:EndEvent') return PALETTE.end;
  if (node.type === 'bpmn:UserTask') return PALETTE.user;
  if (node.type === 'bpmn:ServiceTask') return PALETTE.service;
  if (node.type === 'bpmn:BoundaryEvent') return PALETTE.service;
  if (GATEWAY_TYPES.has(node.type)) {
    if (outgoingCount > 1) return PALETTE.split;
    if (incomingCount > 1) return PALETTE.merge;
  }
  return null;
}

function renderShape(id, elementId, box, colours, label) {
  const attributes = [`id="${escapeXml(id)}"`, `bpmnElement="${escapeXml(elementId)}"`];
  if (colours) {
    attributes.push(`bioc:stroke="${colours.stroke}"`, `bioc:fill="${colours.fill}"`);
    attributes.push(`color:background-color="${colours.fill}"`, `color:border-color="${colours.stroke}"`);
  }
  if (GATEWAY_TYPES.has(box.type ?? '')) attributes.push('isMarkerVisible="true"');

  const bounds = `<dc:Bounds x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" height="${round(box.height)}" />`;
  const labelXml = label
    ? `\n        <bpmndi:BPMNLabel>\n          <dc:Bounds x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" />\n        </bpmndi:BPMNLabel>`
    : '';

  return `      <bpmndi:BPMNShape ${attributes.join(' ')}>\n        ${bounds}${labelXml}\n      </bpmndi:BPMNShape>`;
}

/**
 * Lays out a BPMN file and returns the file with a fresh DI section.
 * The semantic part of the input is preserved byte for byte.
 */
export async function layoutBpmnXml(xml) {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const structure = collectStructure(rootElement);
  let { participants } = structure;

  if (!participants.length) {
    const processes = (rootElement.rootElements ?? []).filter((el) => el.$type === 'bpmn:Process');
    const withNodes = processes.filter((process) => (process.flowElements ?? []).length);
    if (!withNodes.length) return xml; // пустой процесс — раскладывать нечего
    participants = withNodes.map(implicitParticipant);
  }

  // Prepare every pool first, so all of them can share the same width.
  const prepared = participants.map((participant) => {
    const nodes = participant.nodes.map((node) => ({ ...node, ...nodeSize(node.element) }));
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const { rank, backEdges, outgoing, incoming } = computeRanks(nodes, participant.flows);
    const { columnX, contentRight } = assignColumns(nodes, rank);
    const loops = participant.flows.filter((flow) => backEdges.has(flow.id)
      || (rank.get(flow.target) ?? 0) <= (rank.get(flow.source) ?? 0)).length;
    return { participant, nodes, nodesById, rank, backEdges, outgoing, incoming, columnX, contentRight, loops };
  });

  const poolWidth = Math.max(
    ...prepared.map((entry) => entry.contentRight),
    POOL_X + 600
  ) - POOL_X;

  const diagramBlocks = [];
  let poolTop = POOL_Y;

  for (const entry of prepared) {
    const { participant, nodes, nodesById, rank, backEdges, outgoing, incoming, columnX, loops } = entry;
    const { lanes, height: poolHeight } = assignLanes(participant, nodes, rank, columnX, poolTop);

    const poolBottom = poolTop + poolHeight;
    const routes = routeFlows(
      participant, nodes, nodesById, rank, backEdges, outgoing, incoming,
      poolBottom, POOL_X + poolWidth
    );

    const shapes = [];
    const edges = [];

    shapes.push(`      <bpmndi:BPMNShape id="${escapeXml(participant.id)}_di" bpmnElement="${escapeXml(participant.id)}" isHorizontal="true">\n        <dc:Bounds x="${POOL_X}" y="${round(poolTop)}" width="${round(poolWidth)}" height="${round(poolHeight)}" />\n      </bpmndi:BPMNShape>`);

    for (const lane of lanes) {
      shapes.push(`      <bpmndi:BPMNShape id="${escapeXml(lane.id)}_di" bpmnElement="${escapeXml(lane.id)}" isHorizontal="true">\n        <dc:Bounds x="${POOL_X + POOL_PAD}" y="${round(lane.y)}" width="${round(poolWidth - POOL_PAD)}" height="${round(lane.height)}" />\n      </bpmndi:BPMNShape>`);
    }

    for (const node of nodes) {
      const label = EVENT_TYPES.has(node.type) || GATEWAY_TYPES.has(node.type)
        ? {
            x: Math.round(node.x + node.width / 2 - textWidth(node.name) / 2),
            y: Math.round(node.y + node.height + 6),
            width: Math.round(Math.max(20, textWidth(node.name) + 6)),
            height: LABEL_HEIGHT
          }
        : null;
      const colours = shapeColours(node, (outgoing.get(node.id) ?? []).length, (incoming.get(node.id) ?? []).length);
      shapes.push(renderShape(`${node.id}_di`, node.id, { ...node, type: node.type }, colours, label));
    }

    for (const annotation of participant.annotations) {
      const size = nodeSize(annotation.element);
      const anchor = nodes[0];
      annotation.x = anchor ? anchor.x : POOL_X + POOL_PAD + 60;
      annotation.y = poolBottom + 30;
      shapes.push(renderShape(`${annotation.id}_di`, annotation.id, { ...annotation, ...size }, null, null));
    }

    for (const route of routes) {
      const points = route.points.map((point) => `        <di:waypoint x="${round(point.x)}" y="${round(point.y)}" />`).join('\n');
      const label = route.flow.name ? flowLabelBounds(route.points, route.flow.name) : null;
      const labelXml = label
        ? `\n        <bpmndi:BPMNLabel>\n          <dc:Bounds x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" />\n        </bpmndi:BPMNLabel>`
        : '';
      edges.push(`      <bpmndi:BPMNEdge id="${escapeXml(route.flow.id)}_di" bpmnElement="${escapeXml(route.flow.id)}">\n${points}${labelXml}\n      </bpmndi:BPMNEdge>`);
    }

    diagramBlocks.push({ participant, shapes, edges });
    poolTop = poolBottom + POOL_GAP + loops * (STACK_GAP + 4);
  }

  const planeElement = participants[0].collaborationId ?? participants[0].processId;
  const diagramId = `${planeElement}_diagram`;
  const planeId = `${planeElement}_plane`;

  const diXml = [
    `  <bpmndi:BPMNDiagram id="${escapeXml(diagramId)}">`,
    `    <bpmndi:BPMNPlane id="${escapeXml(planeId)}" bpmnElement="${escapeXml(planeElement)}">`,
    ...diagramBlocks.flatMap((block) => [...block.shapes, ...block.edges]),
    '    </bpmndi:BPMNPlane>',
    '  </bpmndi:BPMNDiagram>'
  ].join('\n');

  if (diXml.includes('NaN')) {
    throw new Error('Раскладка дала нечисловые координаты — проверьте исходную схему.');
  }

  return spliceDiagram(xml, diXml);
}

/** Namespaces the generated DI section needs on the root tag. */
const REQUIRED_NS = {
  'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
  'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
  'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI',
  'xmlns:bioc': 'http://bpmn.io/schema/bpmn/biocolor/1.0',
  'xmlns:color': 'http://www.omg.org/spec/BPMN/non-normative/color/1.0'
};

/**
 * Replaces the DI section of the XML, adding the namespaces when missing.
 * Every old plane is dropped: the result holds a single plane with the new geometry.
 */
function spliceDiagram(xml, diXml) {
  const result = xml.replace(/<bpmndi:BPMNDiagram[\s\S]*?<\/bpmndi:BPMNDiagram>\s*/g, '');

  const withDiagram = result.replace(/<\/bpmn:definitions>/, `${diXml}\n</bpmn:definitions>`);

  const missing = Object.entries(REQUIRED_NS)
    .filter(([name]) => !withDiagram.includes(`${name}=`))
    .map(([name, uri]) => `${name}="${uri}"`)
    .join(' ');

  if (!missing) return withDiagram;

  return withDiagram.replace(/<bpmn:definitions(\s|>)/, `<bpmn:definitions ${missing}$1`);
}

export const internals = { collectStructure, computeRanks, nodeSize, textWidth };
