var COLOR_OPTIONS = [
  { color: '#d4edda', title: 'Soft green' },
  { color: '#f8d7da', title: 'Soft red' },
  { color: '#cce5ff', title: 'Soft blue' },
  { color: '#fff3cd', title: 'Soft yellow' },
  { color: '#e2d5f6', title: 'Soft purple' }
];

var POPUP_CLASS = 'djs-color-popup';

/**
 * Adds a "Fill" button to the context pad that opens a color palette popup.
 */
export default function ColorContextPadProvider(contextPad, modeling, translate) {
  this._contextPad = contextPad;
  this._modeling = modeling;
  this._translate = translate;

  contextPad.registerProvider(this);
}

ColorContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'translate'
];

ColorContextPadProvider.prototype.getContextPadEntries = function(element) {
  var modeling = this._modeling;
  var translate = this._translate;
  var contextPad = this._contextPad;

  function openColorPalette(event, element) {
    closeExistingPopups();

    var pad = contextPad.getPad(element);
    if (!pad || !pad.html) return;

    // Create popup
    var popup = document.createElement('div');
    popup.className = POPUP_CLASS;
    popup.setAttribute('aria-label', translate('Fill color'));

    var swatches = document.createElement('div');
    swatches.className = 'djs-color-popup-swatches';

    COLOR_OPTIONS.forEach(function(opt) {
      var swatch = document.createElement('button');
      swatch.className = 'djs-color-swatch';
      swatch.style.background = opt.color;
      swatch.style.borderColor = opt.color;
      swatch.setAttribute('title', translate(opt.title));
      swatch.setAttribute('aria-label', translate(opt.title));
      swatch.addEventListener('click', function(e) {
        e.stopPropagation();
        try {
          modeling.setColor([element], { fill: opt.color });
        } catch (err) {
          console.error('ColorFill: setColor failed', err);
        }
        closeExistingPopups();
      });
      swatches.appendChild(swatch);
    });

    // Reset button
    var resetBtn = document.createElement('button');
    resetBtn.className = 'djs-color-swatch djs-color-swatch-reset';
    resetBtn.setAttribute('title', translate('Remove fill'));
    resetBtn.setAttribute('aria-label', translate('Remove fill'));
    resetBtn.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="14" height="14">' +
      '<line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />' +
      '</svg>';
    resetBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      try {
        modeling.setColor([element], { fill: null });
      } catch (err) {
        console.error('ColorFill: setColor (reset) failed', err);
      }
      closeExistingPopups();
    });
    swatches.appendChild(resetBtn);

    popup.appendChild(swatches);

    // Append popup to the pad's parent (canvas wrapper) for proper positioning
    var canvasWrapper = pad.html.closest('.canvas-wrapper') || document.body;
    canvasWrapper.appendChild(popup);

    // Position popup below the entry button
    var entryEl = pad.html.querySelector('.entry.fill-color');
    if (entryEl) {
      var entryRect = entryEl.getBoundingClientRect();
      var wrapperRect = canvasWrapper.getBoundingClientRect();
      popup.style.position = 'absolute';
      popup.style.left = (entryRect.left - wrapperRect.left + entryRect.width / 2) + 'px';
      popup.style.top = (entryRect.bottom - wrapperRect.top + 4) + 'px';
      popup.style.transform = 'translateX(-50%)';
    }

    // Close on outside click
    function closeHandler(e) {
      if (!popup.contains(e.target)) {
        closeExistingPopups();
        document.removeEventListener('pointerdown', closeHandler);
      }
    }

    // Also close when context pad closes
    function closeOnPadClose() {
      closeExistingPopups();
    }

    setTimeout(function() {
      document.addEventListener('pointerdown', closeHandler);
      document.addEventListener('contextPad.close', closeOnPadClose, { once: true });
    }, 0);
  }

  function closeExistingPopups() {
    var existing = document.querySelectorAll('.' + POPUP_CLASS);
    existing.forEach(function(el) { el.remove(); });
  }

  return {
    'fill': {
      group: 'edit',
      className: 'fill-color',
      title: translate('Fill color'),
      action: {
        click: function(event, element) {
          openColorPalette(event, element);
        }
      }
    }
  };
};
