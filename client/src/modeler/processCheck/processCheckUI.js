/**
 * Process Check UI
 *
 * Manages the validate button in the toolbar, the results panel,
 * and visual highlighting of issues on the diagram.
 * Messages are formatted via i18n — no hardcoded strings.
 */
import { validateProcess } from './processValidator.js';
import { getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

const ERROR_COLOR = '#e74c3c';

/**
 * Format an issue message from i18n template.
 */
function formatIssueMessage(issue, t) {
  // Global issues (no elementId) have their own keys
  const key = 'processCheck.issues.' + issue.type;
  const template = t(key);
  if (!template || template === key) {
    return issue.type;
  }
  return template.replace('{name}', issue.elementName || '');
}

/**
 * @param {Object} options
 * @param {import('bpmn-js/lib/Modeler').default} options.modeler
 * @param {HTMLElement} options.validateButton
 * @param {HTMLElement} options.validateMenu
 * @param {Function} options.t       - i18n translate
 * @param {Function} options.onLocaleChange  - i18n locale change subscriber
 */
export function setupProcessCheckUI({ modeler, validateButton, validateMenu, t, onLocaleChange }) {
  if (!validateButton || !validateMenu) return;

  let currentIssues = [];
  let highlightedElements = new Set();
  let isValid = false;
  let runningValidation = false;

  // ---- helpers ----

  function hasErrorStroke(el) {
    try {
      // Use the same color-resolution logic as the BpmnRenderer
      // (getStrokeColor checks color:border-color, bioc:stroke, then defaults).
      return getStrokeColor(el) === ERROR_COLOR;
    } catch {
      return false;
    }
  }

  function clearHighlights() {
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');

    // Clear tracked elements from this session
    highlightedElements.forEach((id) => {
      try {
        const el = elementRegistry.get(id);
        if (el) {
          modeling.setColor(el, { stroke: null, fill: null });
        }
      } catch {
        // ignore
      }
    });
    highlightedElements.clear();

    // Also clear any elements that have the error stroke color persisted
    // from a previous session (e.g., saved to BPMN DI data).
    // This ensures red highlights are removed even when validation now passes.
    elementRegistry.forEach((el) => {
      try {
        if (hasErrorStroke(el)) {
          modeling.setColor(el, { stroke: null, fill: null });
        }
      } catch {
        // ignore
      }
    });
  }

  function applyHighlights(issueElements) {
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');

    issueElements.forEach((id) => {
      try {
        const el = elementRegistry.get(id);
        if (el) {
          modeling.setColor(el, { stroke: ERROR_COLOR });
          highlightedElements.add(id);
        }
      } catch {
        // ignore
      }
    });
  }

  function selectElement(id) {
    try {
      const el = modeler.get('elementRegistry').get(id);
      if (el) {
        modeler.get('selection').select(el);
        modeler.get('canvas').scrollToElement(el);
      }
    } catch {
      // ignore
    }
  }

  function renderResults() {
    validateMenu.innerHTML = '';

    if (isValid) {
      const validMsg = document.createElement('div');
      validMsg.className = 'check-result-valid';
      validMsg.textContent = t('processCheck.valid');
      validateMenu.appendChild(validMsg);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'button small-button check-result-clear';
      clearBtn.textContent = t('processCheck.clear');
      clearBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        closePanel();
      });
      validateMenu.appendChild(clearBtn);
      return;
    }

    if (currentIssues.length === 0) return;

    const summary = document.createElement('div');
    summary.className = 'check-result-summary';
    summary.textContent = t('processCheck.issuesFound', {
      count: currentIssues.length
    });
    validateMenu.appendChild(summary);

    const list = document.createElement('ul');
    list.className = 'check-result-list';

    currentIssues.forEach((issue) => {
      const li = document.createElement('li');
      li.className = 'check-result-item';

      const icon = document.createElement('span');
      icon.className = 'check-result-icon';
      icon.textContent = issue.type === 'AND_GATEWAY_HINT' ? '⚠' : '✕';

      const text = document.createElement('span');
      text.className = 'check-result-text';
      text.textContent = formatIssueMessage(issue, t);

      if (issue.elementId) {
        li.dataset.elementId = issue.elementId;
        li.classList.add('check-result-item-clickable');
        li.addEventListener('click', () => selectElement(issue.elementId));
        li.addEventListener('mouseenter', () => {
          try {
            const el = modeler.get('elementRegistry').get(issue.elementId);
            if (el) {
              modeler.get('selection').select(el);
            }
          } catch {
            // ignore
          }
        });
      }

      li.appendChild(icon);
      li.appendChild(text);
      list.appendChild(li);
    });

    validateMenu.appendChild(list);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'button small-button check-result-clear';
    clearBtn.textContent = t('processCheck.clear');
    clearBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      closePanel();
    });
    validateMenu.appendChild(clearBtn);
  }

  function runValidation() {
    if (runningValidation) return;
    runningValidation = true;
    try {
      clearHighlights();
      currentIssues = [];
      isValid = false;

      try {
        currentIssues = validateProcess(modeler);
        isValid = currentIssues.length === 0;
      } catch (error) {
        console.error('Process validation failed:', error);
        currentIssues = [
          {
            type: 'VALIDATION_ERROR',
            elementId: '',
            elementName: '',
            elementType: ''
          }
        ];
        isValid = false;
      }

      // Highlight errors (not hints or global issues)
      const errorIds = currentIssues
        .filter((i) => i.type !== 'AND_GATEWAY_HINT' && i.type !== 'VALIDATION_ERROR' && i.elementId)
        .map((i) => i.elementId);

      const uniqueIds = [...new Set(errorIds)];
      applyHighlights(uniqueIds);

      renderResults();
      validateMenu.classList.remove('hidden');
      validateButton.classList.add('active');
      updateButtonState();
    } finally {
      runningValidation = false;
    }
  }

  function closePanel() {
    // Hide panel first — any commandStack.changed from clearHighlights
    // won't re-trigger validation because the panel is now hidden.
    validateMenu.classList.add('hidden');
    validateButton.classList.remove('active');
    clearHighlights();
    currentIssues = [];
    isValid = false;
    updateButtonState();
  }

  function updateButtonState() {
    if (isValid) {
      validateButton.dataset.status = 'valid';
    } else if (currentIssues.length > 0) {
      validateButton.dataset.status = 'invalid';
    } else {
      delete validateButton.dataset.status;
    }
  }

  // ---- event listeners ----

  validateButton.addEventListener('click', () => {
    if (!validateMenu.classList.contains('hidden')) {
      closePanel();
      return;
    }
    runValidation();
  });

  validateMenu.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });

  // Re-run validation on diagram changes (if panel is open)
  modeler.on('commandStack.changed', () => {
    if (!validateMenu.classList.contains('hidden')) {
      runValidation();
    }
  });

  // Close on import
  modeler.on('import.parse.complete', () => {
    closePanel();
  });

  // Re-render on locale change (if panel is open)
  if (typeof onLocaleChange === 'function') {
    onLocaleChange(() => {
      if (!validateMenu.classList.contains('hidden')) {
        if (currentIssues.length > 0 || isValid) {
          renderResults();
        }
      }
    });
  }

  return {
    runValidation,
    closePanel
  };
}
