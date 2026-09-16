import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { isLabel } from 'diagram-js/lib/util/ModelUtil';
import { append as svgAppend, classes as svgClasses } from 'tiny-svg';
import { getLabel } from 'bpmn-js/lib/util/LabelUtil';
import { getLabelColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

/**
 * Custom rule provider that enables resize handles for ALL BPMN shapes.
 * By default, bpmn-js only allows resize for SubProcess, Lane, Participant,
 * TextAnnotation, and Group. This module overrides that to allow resize
 * for tasks, events, gateways, and all other elements.
 *
 * Users can then drag shape borders to resize them, and text will reflow
 * automatically inside the new dimensions.
 *
 * How it works:
 * - BpmnRules registers on 'commandStack.shape.resize.canExecute' with priority 1000
 * - We register with priority 1500 (higher = runs first)
 * - We return true (non-undefined) → EventBus stops propagation
 * - BpmnRules handler is never reached → resize is allowed for all shapes
 */
export default class ResizeAllRules {
  constructor(eventBus) {
    // Priority 1500 > default 1000 → runs before BpmnRules
    eventBus.on('commandStack.shape.resize.canExecute', 1500, (event) => {
      const context = event.context;
      const shape = context.shape;

      // Skip if no shape (shouldn't happen)
      if (!shape) return;

      // Allow resize for all BPMN shapes
      return true;
    });
  }
}

ResizeAllRules.$inject = ['eventBus'];

export class ResizableLabelRenderer extends BaseRenderer {
  constructor(config, eventBus, textRenderer) {
    super(eventBus, 1500);
    this.config = config || {};
    this.textRenderer = textRenderer;
  }

  canRender(element) {
    return isLabel(element);
  }

  drawShape(parentGfx, element, attrs = {}) {
    const text = this.textRenderer.createText(getLabel(element), {
      box: { width: element.width, height: element.height },
      align: 'center-middle',
      style: {
        ...this.textRenderer.getExternalStyle(),
        fill: getLabelColor(
          element,
          this.config.defaultLabelColor,
          this.config.defaultStrokeColor,
          attrs.stroke
        )
      }
    });

    svgClasses(text).add('djs-label');
    svgAppend(parentGfx, text);

    return text;
  }
}

ResizableLabelRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'textRenderer'
];
