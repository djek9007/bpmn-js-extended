import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

import { sanitizeBpmnDi } from '../client/src/modeler/bpmn-di-sanitizer.js';

// The sanitizer relies on the browser DOMParser/XMLSerializer; provide them via happy-dom.
const window = new Window();
globalThis.DOMParser = window.DOMParser;
globalThis.XMLSerializer = window.XMLSerializer;

function wrap(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI">
  <bpmndi:BPMNDiagram><bpmndi:BPMNPlane>${body}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

function findElements(xml, localName) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const all = doc.getElementsByTagName('*');
  const matches = [];

  for (let index = 0; index < all.length; index += 1) {
    if (all[index].localName === localName) {
      matches.push(all[index]);
    }
  }

  return matches;
}

test('returns the exact same string when the XML is valid', () => {
  const xml = wrap(
    '<bpmndi:BPMNShape id="S_di"><dc:Bounds x="10" y="20" width="30" height="40" /></bpmndi:BPMNShape>'
  );

  assert.equal(sanitizeBpmnDi(xml), xml);
});

test('fills missing shape geometry with shape defaults', () => {
  const xml = wrap('<bpmndi:BPMNShape id="S_di"><dc:Bounds x="1" y="2" width="30" /></bpmndi:BPMNShape>');
  const sanitized = sanitizeBpmnDi(xml);

  assert.notEqual(sanitized, xml);

  const [bounds] = findElements(sanitized, 'Bounds');
  assert.equal(bounds.getAttribute('x'), '1');
  assert.equal(bounds.getAttribute('y'), '2');
  assert.equal(bounds.getAttribute('width'), '30');
  assert.equal(bounds.getAttribute('height'), '20');
});

test('uses label defaults for bounds nested in a BPMNLabel', () => {
  const xml = wrap(
    '<bpmndi:BPMNShape id="S_di"><bpmndi:BPMNLabel><dc:Bounds x="5" y="6" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>'
  );
  const [bounds] = findElements(sanitizeBpmnDi(xml), 'Bounds');

  assert.equal(bounds.getAttribute('x'), '5');
  assert.equal(bounds.getAttribute('y'), '6');
  assert.equal(bounds.getAttribute('width'), '50');
  assert.equal(bounds.getAttribute('height'), '14');
});

test('replaces non-finite and empty geometry values', () => {
  const xml = wrap(
    '<bpmndi:BPMNShape id="S_di"><dc:Bounds x="NaN" y="Infinity" width="" height="-Infinity" /></bpmndi:BPMNShape>'
  );
  const [bounds] = findElements(sanitizeBpmnDi(xml), 'Bounds');

  assert.equal(bounds.getAttribute('x'), '0');
  assert.equal(bounds.getAttribute('y'), '0');
  assert.equal(bounds.getAttribute('width'), '100');
  assert.equal(bounds.getAttribute('height'), '20');
});

test('preserves valid decimal geometry values', () => {
  const xml = wrap(
    '<bpmndi:BPMNShape id="S_di"><dc:Bounds x="10.5" y="20.25" width="30.75" height="40" /></bpmndi:BPMNShape>'
  );

  assert.equal(sanitizeBpmnDi(xml), xml);
});

test('repairs missing or non-finite waypoint coordinates', () => {
  const xml = wrap(
    '<bpmndi:BPMNEdge id="F_di"><di:waypoint x="10" /><di:waypoint x="NaN" y="5" /></bpmndi:BPMNEdge>'
  );
  const sanitized = sanitizeBpmnDi(xml);
  const waypoints = findElements(sanitized, 'waypoint');

  assert.equal(waypoints.length, 2);
  assert.equal(waypoints[0].getAttribute('x'), '10');
  assert.equal(waypoints[0].getAttribute('y'), '0');
  assert.equal(waypoints[1].getAttribute('x'), '0');
  assert.equal(waypoints[1].getAttribute('y'), '5');
});

test('repairs every invalid element in the document', () => {
  const xml = wrap(
    '<bpmndi:BPMNShape id="S1_di"><dc:Bounds x="1" y="2" width="30" /></bpmndi:BPMNShape>' +
      '<bpmndi:BPMNShape id="S2_di"><dc:Bounds width="50" /></bpmndi:BPMNShape>'
  );
  const bounds = findElements(sanitizeBpmnDi(xml), 'Bounds');

  assert.equal(bounds.length, 2);
  assert.equal(bounds[0].getAttribute('height'), '20');
  assert.equal(bounds[1].getAttribute('height'), '20');
  assert.equal(bounds[1].getAttribute('x'), '0');
  assert.equal(bounds[1].getAttribute('width'), '50');
});

test('returns malformed XML unchanged', () => {
  const broken = '<bpmn:definitions><bpmn:process></bpmn:definitions>';

  assert.equal(sanitizeBpmnDi(broken), broken);
});

test('returns empty, whitespace and non-string input unchanged', () => {
  assert.equal(sanitizeBpmnDi(''), '');
  assert.equal(sanitizeBpmnDi('   \n  '), '   \n  ');
  assert.equal(sanitizeBpmnDi(null), null);
  assert.equal(sanitizeBpmnDi(undefined), undefined);
  assert.equal(sanitizeBpmnDi(42), 42);
});

test('returns XML without DI elements unchanged', () => {
  const xml = wrap('');

  assert.equal(sanitizeBpmnDi(xml), xml);
});
