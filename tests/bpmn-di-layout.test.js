import { test } from 'node:test';
import assert from 'node:assert/strict';

import { needsDiagramLayout, ensureDiagramLayout } from '../client/src/shared/bpmn-di-layout.js';

const WITH_DI = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Defs0">
  <bpmn:process id="P0">
    <bpmn:startEvent id="S0"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="P0">
      <bpmndi:BPMNShape id="S0_di" bpmnElement="S0">
        <dc:Bounds x="100" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const NO_DI = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Defs1">
  <bpmn:process id="P1" isExecutable="false">
    <bpmn:startEvent id="Start_1"/>
    <bpmn:task id="Task_1"/>
    <bpmn:endEvent id="End_1"/>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End_1"/>
  </bpmn:process>
</bpmn:definitions>`;

// No literal <outgoing> children and no DI, plus lanes/participants/boundary/message
// flow — the shapes that broke the layout library before populateFlowRefs existed.
const NO_DI_LANES = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Defs2">
  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="Part_1" processRef="P1"/>
    <bpmn:participant id="Part_2" processRef="P2"/>
    <bpmn:messageFlow id="Msg_1" sourceRef="TaskA" targetRef="TaskX"/>
  </bpmn:collaboration>
  <bpmn:process id="P1">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1">
        <bpmn:flowNodeRef>StartT</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>TaskA</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>TaskB</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Bound_1</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_2">
        <bpmn:flowNodeRef>EndT</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartT"/>
    <bpmn:task id="TaskA"/>
    <bpmn:task id="TaskB"/>
    <bpmn:boundaryEvent id="Bound_1" attachedToRef="TaskB"/>
    <bpmn:endEvent id="EndT"/>
    <bpmn:sequenceFlow id="T1" sourceRef="StartT" targetRef="TaskA"/>
    <bpmn:sequenceFlow id="T2" sourceRef="TaskA" targetRef="TaskB"/>
    <bpmn:sequenceFlow id="T3" sourceRef="TaskB" targetRef="EndT"/>
  </bpmn:process>
  <bpmn:process id="P2">
    <bpmn:startEvent id="StartX"/>
    <bpmn:task id="TaskX"/>
    <bpmn:endEvent id="EndX"/>
    <bpmn:sequenceFlow id="X1" sourceRef="StartX" targetRef="TaskX"/>
    <bpmn:sequenceFlow id="X2" sourceRef="TaskX" targetRef="EndX"/>
  </bpmn:process>
</bpmn:definitions>`;

function elementIds(xml, tag) {
  return [...xml.matchAll(new RegExp(`<bpmndi:${tag}[^>]*bpmnElement="([^"]+)"`, 'g'))].map(m => m[1]);
}

test('needsDiagramLayout detects missing and empty diagrams', () => {
  assert.equal(needsDiagramLayout(NO_DI), true);
  assert.equal(needsDiagramLayout(WITH_DI.replace(/<bpmndi:BPMNShape[\s\S]*<\/bpmndi:BPMNShape>/, '')
    .replace('<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="P0">', '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="P0"/>')
    .replace(/<\/bpmndi:BPMNPlane>[\s\S]*<\/bpmn:definitions>/, '</bpmn:definitions>')), true);
  assert.equal(needsDiagramLayout(WITH_DI), false);
});

test('ensureDiagramLayout returns files with DI unchanged', async () => {
  assert.equal(await ensureDiagramLayout(WITH_DI), WITH_DI);
});

test('ensureDiagramLayout generates shapes and edges for a DI-less file', async () => {
  const out = await ensureDiagramLayout(NO_DI);
  assert.deepEqual(elementIds(out, 'BPMNShape').sort(), ['End_1', 'Start_1', 'Task_1']);
  assert.deepEqual(elementIds(out, 'BPMNEdge').sort(), ['Flow_1', 'Flow_2']);
});

test('ensureDiagramLayout keeps every flow edge for lanes/participants without <outgoing> children', async () => {
  const out = await ensureDiagramLayout(NO_DI_LANES);
  const shapes = elementIds(out, 'BPMNShape');
  const edges = elementIds(out, 'BPMNEdge');
  for (const id of ['Part_1', 'Part_2', 'Lane_1', 'Lane_2', 'StartT', 'TaskA', 'TaskB', 'Bound_1', 'EndT', 'StartX', 'TaskX', 'EndX']) {
    assert.ok(shapes.includes(id), `missing shape for ${id}`);
  }
  for (const id of ['T1', 'T2', 'T3', 'X1', 'X2', 'Msg_1']) {
    assert.ok(edges.includes(id), `missing edge for ${id}`);
  }
});
