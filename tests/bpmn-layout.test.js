import { test } from 'node:test';
import assert from 'node:assert/strict';

import { layoutBpmnXml } from '../server/bpmn-layout.js';
import { checkBpmnXml } from '../server/bpmn-check.js';

const SEMANTIC_ONLY = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Defs1">
  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="Participant_UC1" name="UC-1. Проверка" processRef="P1"/>
  </bpmn:collaboration>
  <bpmn:process id="P1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_User" name="Пользователь">
        <bpmn:flowNodeRef>Start</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>UT_Fill</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Favorit" name="Система Favorit">
        <bpmn:flowNodeRef>ST_Check</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>GW_Decision</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_Ok</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_Error</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start" name="Начало">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UT_Fill" name="Заполнить поле">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="ST_Check" name="Проверить">
      <bpmn:incoming>F2</bpmn:incoming>
      <bpmn:outgoing>F3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:exclusiveGateway id="GW_Decision" name="Верно?">
      <bpmn:incoming>F3</bpmn:incoming>
      <bpmn:outgoing>F4</bpmn:outgoing>
      <bpmn:outgoing>F5</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="End_Ok" name="Готово">
      <bpmn:incoming>F4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Error" name="Ошибка">
      <bpmn:incoming>F5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start" targetRef="UT_Fill"/>
    <bpmn:sequenceFlow id="F2" sourceRef="UT_Fill" targetRef="ST_Check"/>
    <bpmn:sequenceFlow id="F3" sourceRef="ST_Check" targetRef="GW_Decision"/>
    <bpmn:sequenceFlow id="F4" name="да" sourceRef="GW_Decision" targetRef="End_Ok"/>
    <bpmn:sequenceFlow id="F5" name="нет" sourceRef="GW_Decision" targetRef="End_Error"/>
  </bpmn:process>
</bpmn:definitions>`;

/** Segments of every edge, split into horizontal and vertical parts. */
function edgeSegments(xml) {
  const edges = [];
  for (const match of xml.matchAll(/<bpmndi:BPMNEdge[^>]*bpmnElement="([^"]+)"[^>]*>([\s\S]*?)<\/bpmndi:BPMNEdge>/g)) {
    const points = [...match[2].matchAll(/<di:waypoint x="([-\d.]+)" y="([-\d.]+)"/g)]
      .map((point) => ({ x: Number(point[1]), y: Number(point[2]) }));
    edges.push({ id: match[1], points });
  }
  return edges;
}

function overlapLength(a, b) {
  const horizontalA = a.y1 === a.y2;
  const horizontalB = b.y1 === b.y2;
  if (horizontalA !== horizontalB) return 0;
  if (horizontalA) {
    if (Math.abs(a.y1 - b.y1) > 1) return 0;
    return Math.max(0, Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2))
      - Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2)));
  }
  if (Math.abs(a.x1 - b.x1) > 1) return 0;
  return Math.max(0, Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2))
    - Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2)));
}

test('layout builds a DI section for a semantic only file', async () => {
  const laidOut = await layoutBpmnXml(SEMANTIC_ONLY);

  assert.match(laidOut, /<bpmndi:BPMNDiagram/);
  assert.match(laidOut, /bpmnElement="Start"/);
  assert.equal((laidOut.match(/<bpmndi:BPMNShape/g) ?? []).length, 9, 'пул, две дорожки и шесть узлов');
  assert.equal((laidOut.match(/<bpmndi:BPMNEdge/g) ?? []).length, 5);
});

test('layout keeps the semantic section untouched', async () => {
  const laidOut = await layoutBpmnXml(SEMANTIC_ONLY);
  // The root tag gains the colour namespaces, the body of the semantic section stays as it was.
  const body = (xml) => {
    const start = xml.indexOf('\n', xml.indexOf('\n') + 1) + 1;
    const end = xml.indexOf('<bpmndi:BPMNDiagram');
    return xml.slice(start, end === -1 ? xml.indexOf('</bpmn:definitions>') : end).trim();
  };

  assert.equal(body(laidOut), body(SEMANTIC_ONLY));
});

test('layout produces edges that do not lie on top of each other', async () => {
  const laidOut = await layoutBpmnXml(SEMANTIC_ONLY);
  const edges = edgeSegments(laidOut);

  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      for (let a = 1; a < edges[i].points.length; a += 1) {
        for (let b = 1; b < edges[j].points.length; b += 1) {
          const segmentA = { x1: edges[i].points[a - 1].x, y1: edges[i].points[a - 1].y, x2: edges[i].points[a].x, y2: edges[i].points[a].y };
          const segmentB = { x1: edges[j].points[b - 1].x, y1: edges[j].points[b - 1].y, x2: edges[j].points[b].x, y2: edges[j].points[b].y };
          assert.ok(overlapLength(segmentA, segmentB) <= 2,
            `потоки ${edges[i].id} и ${edges[j].id} лежат друг на друге`);
        }
      }
    }
  }
});

test('layout output passes the validator', async () => {
  const laidOut = await layoutBpmnXml(SEMANTIC_ONLY);
  const result = await checkBpmnXml(laidOut);

  assert.deepEqual(result.findings.filter((item) => item.severity === 'error'), []);
  assert.equal(result.status, 'ok');
});

test('validator reports a task with two incoming flows', async () => {
  const broken = SEMANTIC_ONLY
    .replace('<bpmn:sequenceFlow id="F4" name="да" sourceRef="GW_Decision" targetRef="End_Ok"/>',
      '<bpmn:sequenceFlow id="F4" name="да" sourceRef="GW_Decision" targetRef="UT_Fill"/>')
    .replace('<bpmn:outgoing>F4</bpmn:outgoing>', '<bpmn:outgoing>F4</bpmn:outgoing>')
    .replace('<bpmn:incoming>F1</bpmn:incoming>', '<bpmn:incoming>F1</bpmn:incoming><bpmn:incoming>F4</bpmn:incoming>');

  const result = await checkBpmnXml(broken);
  const merge = result.findings.find((item) => item.element === 'UT_Fill' && item.severity === 'error');

  assert.ok(merge, 'ожидалась ошибка о нескольких входящих потоках');
  assert.match(merge.message, /merge/);
});
