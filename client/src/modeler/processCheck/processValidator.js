/**
 * BPMN Process Validator
 *
 * Walks the process graph and returns structured Issue objects.
 * Supports collaborations with message flows between pools.
 *
 * Rules:
 *  - Start/End Events completeness
 *  - Gateway connectivity (incoming/outgoing)
 *  - Task connectivity (sequence flow OR message flow is sufficient)
 *  - Reachability from Start Events (follows sequence flows + message flows)
 *  - Dead ends (paths that don't reach an End Event)
 */

const TASK_TYPES = new Set([
  'bpmn:Task',
  'bpmn:ServiceTask',
  'bpmn:UserTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:ManualTask',
  'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess'
]);

const GATEWAY_TYPES = new Set([
  'bpmn:ExclusiveGateway',
  'bpmn:ParallelGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ComplexGateway',
  'bpmn:EventBasedGateway'
]);

const FLOW_NODE_TYPES = new Set([
  'bpmn:StartEvent',
  'bpmn:EndEvent',
  'bpmn:IntermediateCatchEvent',
  'bpmn:IntermediateThrowEvent',
  'bpmn:BoundaryEvent',
  ...TASK_TYPES,
  ...GATEWAY_TYPES
]);

function getNodeLabel(node) {
  return node.element.name || node.id;
}

function makeIssue(type, node) {
  return {
    type,
    elementId: node ? node.id : '',
    elementName: node ? getNodeLabel(node) : '',
    elementType: node ? node.type : ''
  };
}

/**
 * Returns an array of Issue objects.
 */
export function validateProcess(modeler) {
  const issues = [];

  // ---------- collect BPMN elements ----------
  let definitions;

  if (typeof modeler.getDefinitions === 'function') {
    definitions = modeler.getDefinitions();
  } else {
    const rootShape = modeler.get('canvas').getRootElement();
    definitions = rootShape?.businessObject?.$parent;
  }

  if (!definitions || definitions.$type !== 'bpmn:Definitions') {
    return [makeIssue('NO_DEFINITIONS')];
  }

  const process = definitions.rootElements.find(
    (r) => r.$type === 'bpmn:Process'
  );

  if (!process) {
    return [makeIssue('NO_PROCESS')];
  }

  // ---------- Collect message flows (from collaboration) ----------
  const collaboration = definitions.rootElements.find(
    (r) => r.$type === 'bpmn:Collaboration'
  );

  const messageFlows = [];
  if (collaboration && Array.isArray(collaboration.messageFlows)) {
    collaboration.messageFlows.forEach((mf) => {
      messageFlows.push({
        id: mf.id,
        sourceRef: mf.sourceRef ? mf.sourceRef.id : null,
        targetRef: mf.targetRef ? mf.targetRef.id : null
      });
    });
  }

  // Build set of element IDs that belong to our process
  const ourElementIds = new Set();

  const flowElements = process.flowElements || [];

  // id → node descriptor
  const nodes = new Map();

  // id → { sourceRef, targetRef } (sequence flows)
  const flowMap = new Map();

  flowElements.forEach((el) => {
    if (el.$type === 'bpmn:SequenceFlow') {
      flowMap.set(el.id, {
        sourceRef: el.sourceRef ? el.sourceRef.id : null,
        targetRef: el.targetRef ? el.targetRef.id : null
      });
    }

    if (FLOW_NODE_TYPES.has(el.$type)) {
      ourElementIds.add(el.id);
      nodes.set(el.id, {
        id: el.id,
        element: el,
        type: el.$type,
        name: el.name || '',
        incoming: el.incoming ? el.incoming.map((f) => f.id) : [],
        outgoing: el.outgoing ? el.outgoing.map((f) => f.id) : [],
        incomingMsg: [],  // message flows where target is this element
        outgoingMsg: []   // message flows where source is this element
      });
    }
  });

  // Ensure all sequence flow connections are reflected in node incoming/outgoing.
  // Some BPMN files omit <bpmn:incoming>/<bpmn:outgoing> children on flow nodes,
  // relying solely on sequenceFlow sourceRef/targetRef. The moddle parser does
  // NOT automatically populate el.incoming/el.outgoing from these references.
  flowMap.forEach((flow, flowId) => {
    if (flow.sourceRef && nodes.has(flow.sourceRef)) {
      const src = nodes.get(flow.sourceRef);
      if (!src.outgoing.includes(flowId)) {
        src.outgoing.push(flowId);
      }
    }
    if (flow.targetRef && nodes.has(flow.targetRef)) {
      const tgt = nodes.get(flow.targetRef);
      if (!tgt.incoming.includes(flowId)) {
        tgt.incoming.push(flowId);
      }
    }
  });

  // Tag elements with their message flows
  messageFlows.forEach((mf) => {
    if (ourElementIds.has(mf.sourceRef)) {
      const node = nodes.get(mf.sourceRef);
      if (node) node.outgoingMsg.push(mf);
    }
    if (ourElementIds.has(mf.targetRef)) {
      const node = nodes.get(mf.targetRef);
      if (node) node.incomingMsg.push(mf);
    }
  });

  // ---------- helpers ----------
  const startEvents = [...nodes.values()].filter(
    (n) => n.type === 'bpmn:StartEvent'
  );
  const endEvents = [...nodes.values()].filter(
    (n) => n.type === 'bpmn:EndEvent'
  );

  function hasIncomingMessage(id) {
    return messageFlows.some((mf) => mf.targetRef === id);
  }

  function hasOutgoingMessage(id) {
    return messageFlows.some((mf) => mf.sourceRef === id);
  }

  // ---------- 1. Start / End Event basics ----------
  if (startEvents.length === 0) {
    issues.push(makeIssue('NO_START_EVENT'));
  }

  if (endEvents.length === 0) {
    issues.push(makeIssue('NO_END_EVENT'));
  }

  startEvents.forEach((s) => {
    if (s.incoming.length > 0) {
      issues.push(makeIssue('START_HAS_INCOMING', s));
    }
    if (s.outgoing.length === 0) {
      issues.push(makeIssue('START_NO_OUTGOING', s));
    }
  });

  endEvents.forEach((e) => {
    if (e.incoming.length === 0) {
      issues.push(makeIssue('END_NO_INCOMING', e));
    }
    if (e.outgoing.length > 0) {
      issues.push(makeIssue('END_HAS_OUTGOING', e));
    }
  });

  // ---------- 2. Task connectivity (sequence OR message flow is OK) ----------
  nodes.forEach((n) => {
    if (!TASK_TYPES.has(n.type)) return;

    // Incoming: sequence flow OR message flow
    if (n.incoming.length === 0 && n.incomingMsg.length === 0) {
      issues.push(makeIssue('TASK_NO_INCOMING', n));
    }
    // Outgoing: sequence flow OR message flow
    if (n.outgoing.length === 0 && n.outgoingMsg.length === 0) {
      issues.push(makeIssue('TASK_NO_OUTGOING', n));
    }
  });

  // ---------- 3. Gateway connectivity ----------
  nodes.forEach((n) => {
    if (!GATEWAY_TYPES.has(n.type)) return;

    // Gateways should always have sequence flows (message flows are unusual)
    if (n.incoming.length === 0) {
      issues.push(makeIssue('GATEWAY_NO_INCOMING', n));
    }
    if (n.outgoing.length === 0) {
      issues.push(makeIssue('GATEWAY_NO_OUTGOING', n));
    }
  });

  // ---------- 4. Reachability (BFS from Start Events) ----------
  const visited = new Set();
  const startIds = startEvents.map((s) => s.id);

  // Standard BFS following sequence flows
  function bfsFrom(queue, visitedSet) {
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visitedSet.has(currentId)) continue;
      visitedSet.add(currentId);

      const node = nodes.get(currentId);
      if (!node) continue;

      // Follow outgoing sequence flows
      node.outgoing.forEach((flowId) => {
        const flow = flowMap.get(flowId);
        if (flow && flow.targetRef) {
          queue.push(flow.targetRef);
        }
      });
    }
  }

  // Phase 1: BFS from Start Events via sequence flows
  const initialQueue = [...startIds];
  bfsFrom(initialQueue, visited);

  // Phase 2: elements triggered by incoming message flows
  // If an element receives a message (incomingMsg), it is reachable.
  // Continue BFS from it to discover downstream elements.
  let newReachable;
  do {
    newReachable = false;
    const additionalQueue = [];

    nodes.forEach((n) => {
      if (visited.has(n.id)) return;

      // Element has incoming message flow → reachable via message
      // (Don't mark visited here — let bfsFrom handle it, otherwise
      // bfsFrom skips the element and never follows its outgoing edges.)
      if (n.incomingMsg.length > 0) {
        additionalQueue.push(n.id);
        newReachable = true;
      }
    });

    // Continue BFS from newly discovered elements
    bfsFrom(additionalQueue, visited);
  } while (newReachable);

  // Report unreachable nodes
  nodes.forEach((n) => {
    if (n.type === 'bpmn:StartEvent') return;
    if (visited.has(n.id)) return;
    issues.push(makeIssue('UNREACHABLE', n));
  });

  // ---------- 5. Dead ends ----------
  visited.forEach((id) => {
    const n = nodes.get(id);
    if (!n) return;
    if (n.type === 'bpmn:EndEvent') return;
    if (n.type === 'bpmn:StartEvent') return;

    // Skip if element has outgoing message flow (response goes to other pool)
    if (n.outgoingMsg.length > 0) return;

    if (n.outgoing.length === 0) {
      issues.push(makeIssue('DEAD_END', n));
    }
  });

  // ---------- 6. AND gateway pairing hint ----------
  const andGateways = [...nodes.values()].filter(
    (n) => n.type === 'bpmn:ParallelGateway'
  );
  if (andGateways.length % 2 !== 0) {
    andGateways.forEach((g) => {
      issues.push(makeIssue('AND_GATEWAY_HINT', g));
    });
  }

  return issues;
}
