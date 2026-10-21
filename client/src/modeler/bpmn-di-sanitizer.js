const BOUNDS_ATTRIBUTES = ['x', 'y', 'width', 'height'];
const WAYPOINT_ATTRIBUTES = ['x', 'y'];
const SHAPE_BOUNDS_DEFAULTS = { x: 0, y: 0, width: 100, height: 20 };
const LABEL_BOUNDS_DEFAULTS = { x: 0, y: 0, width: 50, height: 14 };
const WAYPOINT_DEFAULTS = { x: 0, y: 0 };

function ensureFiniteAttribute(element, name, fallback) {
  const value = Number.parseFloat(element.getAttribute(name));

  if (Number.isFinite(value)) {
    return false;
  }

  element.setAttribute(name, String(fallback));

  return true;
}

function sanitizeBoundsElement(element) {
  const isLabel = element.parentNode?.localName === 'BPMNLabel';
  const defaults = isLabel ? LABEL_BOUNDS_DEFAULTS : SHAPE_BOUNDS_DEFAULTS;

  return BOUNDS_ATTRIBUTES.reduce(
    (changed, name) => ensureFiniteAttribute(element, name, defaults[name]) || changed,
    false
  );
}

function sanitizeWaypointElement(element) {
  return WAYPOINT_ATTRIBUTES.reduce(
    (changed, name) => ensureFiniteAttribute(element, name, WAYPOINT_DEFAULTS[name]) || changed,
    false
  );
}

/**
 * Repairs missing or non-finite geometry in BPMN DI (dc:Bounds / di:waypoint).
 * Invalid values make bpmn-js throw during rendering and leave the modeler
 * unable to render or edit the diagram.
 * Returns the original string when nothing needs fixing.
 */
export function sanitizeBpmnDi(xml) {
  if (typeof xml !== 'string' || !xml.trim()) {
    return xml;
  }

  let parsedDocument;

  try {
    parsedDocument = new DOMParser().parseFromString(xml, 'application/xml');
  } catch (error) {
    console.warn('Unable to parse BPMN XML for sanitising.', error);
    return xml;
  }

  if (!parsedDocument || parsedDocument.getElementsByTagName('parsererror').length) {
    return xml;
  }

  const elements = parsedDocument.getElementsByTagName('*');
  let changed = false;

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];

    if (element.localName === 'Bounds') {
      changed = sanitizeBoundsElement(element) || changed;
    } else if (element.localName === 'waypoint') {
      changed = sanitizeWaypointElement(element) || changed;
    }
  }

  return changed ? new XMLSerializer().serializeToString(parsedDocument) : xml;
}
