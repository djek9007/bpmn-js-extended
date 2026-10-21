import { BpmnModdle } from 'bpmn-moddle';
import { layoutProcess } from 'yet-another-bpmn-auto-layout';

const HAS_DIAGRAM = /<bpmndi:BPMNDiagram[\s>]/;
const HAS_SHAPE_OR_EDGE = /<bpmndi:BPMN(?:Shape|Edge)[\s>]/;

export function needsDiagramLayout(xml) {
  return !HAS_DIAGRAM.test(xml) || !HAS_SHAPE_OR_EDGE.test(xml);
}

// bpmn-moddle fills flowNode.outgoing/incoming only from literal <outgoing>/<incoming>
// XML children; YABAL's layout relies on them, so rebuild from sequenceFlow refs.
function populateFlowRefs(element) {
  for (const child of element.flowElements ?? []) {
    if (child.$type === 'bpmn:SequenceFlow') {
      const { sourceRef, targetRef } = child;
      if (sourceRef && !(sourceRef.outgoing ?? []).includes(child)) (sourceRef.outgoing ??= []).push(child);
      if (targetRef && !(targetRef.incoming ?? []).includes(child)) (targetRef.incoming ??= []).push(child);
    } else {
      populateFlowRefs(child);
    }
  }
}

export async function ensureDiagramLayout(xml) {
  if (!needsDiagramLayout(xml)) return xml;

  try {
    const moddle = new BpmnModdle();
    const { rootElement } = await moddle.fromXML(xml);
    for (const element of rootElement.rootElements ?? []) populateFlowRefs(element);
    return await layoutProcess(rootElement);
  } catch (error) {
    // shortcut: layout failure falls back to raw import, surfacing the original
    // "no diagram to display" error; upgrade path — dedicated user-facing notice
    console.warn('BPMN DI auto-layout failed, importing the file as-is.', error);
    return xml;
  }
}
