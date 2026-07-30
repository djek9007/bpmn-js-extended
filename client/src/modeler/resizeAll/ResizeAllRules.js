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
