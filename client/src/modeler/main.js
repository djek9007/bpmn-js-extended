import BpmnModeler from 'bpmn-js/lib/Modeler';
import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdleDescriptors from 'camunda-bpmn-moddle/resources/camunda.json';
import resizeAllModule from './resizeAll/index.js';
import colorFillModule from './colorFill/index.js';
import { setupProcessCheckUI } from './processCheck/processCheckUI.js';
import { exportPng, exportSvg, sanitizeFilename } from './export/index.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import {
  applyTranslations,
  getAvailableLocales,
  getCurrentLocale,
  initializeLocale,
  onLocaleChange,
  setLocale,
  t
} from '../i18n/index.js';
import { ensureUiConfig, renderHeaderLogo } from '../shared/uiConfig.js';

const DEFAULT_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    camundaPlatformBehaviors,
    resizeAllModule,
    colorFillModule
  ],
  moddleExtensions: {
    camunda: camundaModdleDescriptors
  }
});

const newDiagramButton = document.getElementById('new-diagram');
const importButton = document.getElementById('import-file');
const downloadButton = document.getElementById('download-diagram');
const exportSvgButton = document.getElementById('export-svg');
const exportPngButton = document.getElementById('export-png');
const editXmlButton = document.getElementById('edit-xml');
const saveButton = document.getElementById('save-diagram');
const shareButton = document.getElementById('share-diagram');
const storageToggle = document.getElementById('toggle-storage');
const fileBrowser = document.getElementById('file-browser');
const closeStorage = document.getElementById('close-storage');
const storageTree = document.getElementById('storage-tree');
const saveForm = document.getElementById('save-form');
const savePathInput = document.getElementById('save-path');
const folderForm = document.getElementById('folder-form');
const folderPathInput = document.getElementById('folder-path');
const fileInput = document.getElementById('file-input');
const themeToggle = document.getElementById('theme-toggle');
const appLogoContainer = document.getElementById('app-logo');
const diagramNameElement = document.getElementById('diagram-name');
const shareDialog = document.getElementById('share-dialog');
const shareForm = document.getElementById('share-form');
const shareModeInputs = shareForm ? Array.from(shareForm.querySelectorAll('input[name="share-mode"]')) : [];
const shareLinkGroup = document.getElementById('share-link-group');
const shareLinkInput = document.getElementById('share-link');
const copyShareLinkButton = document.getElementById('copy-share-link');
const shareErrorElement = document.getElementById('share-error');
const shareCancelButton = document.getElementById('share-cancel');
const shareGenerateButton = document.getElementById('share-generate');
const languageSelect = document.getElementById('language-select');
const xmlDialog = document.getElementById('xml-editor-dialog');
const xmlForm = document.getElementById('xml-editor-form');
const xmlTextarea = document.getElementById('xml-editor-textarea');
const xmlErrorElement = document.getElementById('xml-editor-error');
const xmlCancelButton = document.getElementById('xml-editor-cancel');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const zoomFitButton = document.getElementById('zoom-fit');
const moreActionsToggle = document.getElementById('more-actions-toggle');
const moreActionsMenu = document.getElementById('more-actions-menu');
const colorFillButton = document.getElementById('color-fill');
const colorFillMenu = document.getElementById('color-fill-menu');
const validateButton = document.getElementById('validate-process');
const validateMenu = document.getElementById('validate-menu');
const autoSaveStatus = document.getElementById('auto-save-status');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');
const deleteButton = document.getElementById('delete-button');

const THEME_STORAGE_KEY = 'bpmn-theme-preference';
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

let currentActiveNode;
let currentDiagramName = '';
let currentStoragePath = null;
let shareOperationInFlight = false;
let exportInFlight = false;
let isMoreActionsOpen = false;
let isColorFillOpen = false;
let selectedElements = [];
let autoSaveTimer = null;
let autoSaveDirty = false;

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read theme preference from storage.', error);
    return null;
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
}

function clearStoredTheme() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear theme preference.', error);
  }
}

function updateThemeToggle(theme) {
  if (!themeToggle) {
    return;
  }

  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  const actionLabel = isDark ? t('theme.switchToLight') : t('theme.switchToDark');
  const followSystemHint = t('theme.followSystemHint');
  themeToggle.setAttribute('aria-label', isDark ? t('theme.activateLight') : t('theme.activateDark'));
  themeToggle.setAttribute('title', `${actionLabel}\n${followSystemHint}`);
}

function applyTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = normalizedTheme;
  updateThemeToggle(normalizedTheme);
}

function initializeTheme() {
  const storedTheme = readStoredTheme();
  const initialTheme = storedTheme ?? (prefersDarkScheme.matches ? 'dark' : 'light');
  applyTheme(initialTheme);

  prefersDarkScheme.addEventListener('change', (event) => {
    if (!readStoredTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
}

function updateMoreActionsToggleAria() {
  if (!moreActionsToggle) {
    return;
  }

  const labelKey = isMoreActionsOpen ? 'actions.moreActions.close' : 'actions.moreActions.open';
  const label = t(labelKey);


  if (label) {
    moreActionsToggle.setAttribute('aria-label', label);
    moreActionsToggle.setAttribute('title', label);
  }
}

function setMoreActionsOpen(open) {
  if (!moreActionsToggle || !moreActionsMenu) {
    isMoreActionsOpen = false;
    return;
  }

  if (isMoreActionsOpen === open) {
    updateMoreActionsToggleAria();
    return;
  }

  isMoreActionsOpen = open;
  moreActionsToggle.setAttribute('aria-expanded', String(open));
  moreActionsMenu.classList.toggle('hidden', !open);
  moreActionsMenu.setAttribute('aria-hidden', String(!open));

  if (open) {
    document.addEventListener('pointerdown', handleMoreActionsPointerDown);
    document.addEventListener('keydown', handleMoreActionsKeydown);
  } else {
    document.removeEventListener('pointerdown', handleMoreActionsPointerDown);
    document.removeEventListener('keydown', handleMoreActionsKeydown);
  }

  updateMoreActionsToggleAria();
}

function closeMoreActionsMenu() {
  setMoreActionsOpen(false);
}

function updateColorFillButtonState() {
  if (!colorFillButton) return;

  const hasSelection = selectedElements.length > 0;
  colorFillButton.disabled = !hasSelection;

  if (!hasSelection) {
    closeColorFillMenu();
  }
}

function setColorFillOpen(open) {
  if (!colorFillButton || !colorFillMenu) {
    isColorFillOpen = false;
    return;
  }

  if (isColorFillOpen === open) return;

  isColorFillOpen = open;
  colorFillMenu.classList.toggle('hidden', !open);
  colorFillMenu.setAttribute('aria-hidden', String(!open));

  if (open) {
    document.addEventListener('pointerdown', handleColorFillPointerDown);
    document.addEventListener('keydown', handleColorFillKeydown);
  } else {
    document.removeEventListener('pointerdown', handleColorFillPointerDown);
    document.removeEventListener('keydown', handleColorFillKeydown);
  }
}

function closeColorFillMenu() {
  setColorFillOpen(false);
}

function handleColorFillPointerDown(event) {
  if (!colorFillMenu || !colorFillButton) return;

  const target = event.target;
  if (target instanceof Node && (colorFillMenu.contains(target) || colorFillButton.contains(target))) {
    return;
  }

  closeColorFillMenu();
}

function handleColorFillKeydown(event) {
  if (event.key !== 'Escape') return;

  closeColorFillMenu();
  if (colorFillButton) colorFillButton.focus();
}

function applyColorToSelection(color) {
  if (!selectedElements.length) {
    console.warn('ColorFill: no elements selected');
    return;
  }

  try {
    const modeling = modeler.get('modeling');
    if (color) {
      modeling.setColor(selectedElements, { fill: color });
    } else {
      modeling.setColor(selectedElements, { fill: null });
    }
    closeColorFillMenu();
  } catch (error) {
    console.error('ColorFill: failed to apply color:', error);
  }
}

function setActiveColorSwatch(color) {
  if (!colorFillMenu) return;

  const swatches = colorFillMenu.querySelectorAll('.color-swatch');
  swatches.forEach((swatch) => {
    const swatchColor = swatch.dataset.color || '';
    swatch.classList.toggle('active', swatchColor === color);
  });
}

function setAutoSaveStatus(state) {
  if (!autoSaveStatus) return;

  autoSaveStatus.classList.remove('visible', 'saved', 'saving', 'error');

  if (state === 'hidden') {
    return;
  }

  autoSaveStatus.classList.add('visible');

  switch (state) {
    case 'saving':
      autoSaveStatus.classList.add('saving');
      autoSaveStatus.dataset.i18n = 'autoSave.saving';
      autoSaveStatus.textContent = t('autoSave.saving');
      break;
    case 'saved':
      autoSaveStatus.classList.add('saved');
      autoSaveStatus.dataset.i18n = 'autoSave.saved';
      autoSaveStatus.textContent = t('autoSave.saved');
      // Auto-hide after 3s
      setTimeout(function() {
        setAutoSaveStatus('hidden');
      }, 3000);
      break;
    case 'error':
      autoSaveStatus.classList.add('error');
      autoSaveStatus.dataset.i18n = 'autoSave.error';
      autoSaveStatus.textContent = t('autoSave.error');
      break;
  }
}

async function performAutoSave() {
  if (!currentStoragePath) return;

  setAutoSaveStatus('saving');

  try {
    const { xml } = await modeler.saveXML({ format: true });
    const response = await fetch('/api/storage/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentStoragePath, contents: xml })
    });

    if (!response.ok) {
      throw new Error('Auto-save failed');
    }

    setAutoSaveStatus('saved');
    autoSaveDirty = false;
  } catch (error) {
    console.error('Auto-save failed:', error);
    setAutoSaveStatus('error');
  }
}

function triggerAutoSave() {
  if (!currentStoragePath) return;

  autoSaveDirty = true;

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(function() {
    performAutoSave();
    autoSaveTimer = null;
  }, 4000);
}

function cancelAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  setAutoSaveStatus('hidden');
}

function updateActiveColorFromSelection() {
  if (!selectedElements.length) {
    setActiveColorSwatch('');
    return;
  }

  // Get the fill color of the first selected element
  try {
    const elementRegistry = modeler.get('elementRegistry');
    const element = selectedElements[0];
    const di = element.businessObject?.di || element.di;
    const fillColor = di?.['background-color'] || '';
    setActiveColorSwatch(fillColor);
  } catch {
    setActiveColorSwatch('');
  }
}

function handleMoreActionsPointerDown(event) {
  if (!moreActionsMenu || !moreActionsToggle) {
    return;
  }

  const target = event.target;

  if (target instanceof Node && (moreActionsMenu.contains(target) || moreActionsToggle.contains(target))) {
    return;
  }

  closeMoreActionsMenu();
}

function handleMoreActionsKeydown(event) {
  if (event.key !== 'Escape') {
    return;
  }

  closeMoreActionsMenu();

  if (moreActionsToggle) {
    moreActionsToggle.focus();
  }
}

function normalizeStoragePath(path) {
  return path?.replace(/\\+/g, '/') ?? '';
}

function stripBpmnExtension(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name.replace(/\.bpmn$/i, '');
}

function normalizeDiagramName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';

  if (!trimmed) {
    return '';
  }

  return stripBpmnExtension(trimmed);
}

function deriveNameFromPath(path) {
  if (!path) {
    return '';
  }

  const normalizedPath = normalizeStoragePath(path);
  const segments = normalizedPath.split('/');
  const candidate = segments.filter(Boolean).pop() ?? normalizedPath;

  return normalizeDiagramName(candidate || '');
}

function setDiagramSource(path, fallbackName = '') {
  currentStoragePath = path ? normalizeStoragePath(path) : null;

  if (currentStoragePath) {
    currentDiagramName = deriveNameFromPath(currentStoragePath);
  } else if (typeof fallbackName === 'string') {
    currentDiagramName = normalizeDiagramName(fallbackName);
  } else {
    currentDiagramName = '';
  }

  updateShareModeAvailability();
  updateDiagramTitle();
  updateModelerUrl();
  updateSaveButtonState();
}

function getDiagramDisplayName() {
  if (currentDiagramName?.trim()) {
    return currentDiagramName.trim();
  }

  return t('diagram.unsaved');
}

function updateDiagramTitle() {
  if (!diagramNameElement) {
    return;
  }

  const diagramTitle = getDiagramDisplayName();
  diagramNameElement.textContent = diagramTitle;
  diagramNameElement.title = currentStoragePath ?? diagramTitle;
  document.title = `${diagramTitle} - ${t('app.modelerTitle')}`;
}

function getDiagramUrlIdentifier() {
  if (currentStoragePath?.trim()) {
    const normalizedPath = normalizeStoragePath(currentStoragePath).trim();

    if (normalizedPath) {
      const segments = normalizedPath.split('/');
      const fileName = segments.pop();
      const sanitizedFileName = normalizeDiagramName(fileName) || fileName?.trim();

      if (sanitizedFileName) {
        segments.push(sanitizedFileName);
      }

      const identifier = segments.filter(Boolean).join('/');

      if (identifier) {
        return identifier;
      }
    }
  }

  if (currentDiagramName?.trim()) {
    return currentDiagramName.trim();
  }

  return 'new';
}

function updateModelerUrl() {
  if (!window?.history?.replaceState) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const identifier = getDiagramUrlIdentifier();

  params.set('diagram', identifier);

  const query = params.toString();
  const hash = window.location.hash;
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;

  window.history.replaceState(null, '', newUrl);
}

function updateShareModeAvailability() {
  if (!shareModeInputs.length) {
    return;
  }

  const hasSource = Boolean(currentStoragePath);
  const snapshotRadio = shareModeInputs.find((input) => input.value === 'snapshot');

  shareModeInputs.forEach((input) => {
    if (input.value === 'source') {
      input.disabled = !hasSource;

      if (!hasSource && input.checked && snapshotRadio && !snapshotRadio.disabled) {
        snapshotRadio.checked = true;
      }
    }

    const optionContainer = input.closest('.share-option');

    if (optionContainer) {
      optionContainer.classList.toggle('disabled', input.disabled);
    }
  });
}

function setDefaultShareMode() {
  if (!shareModeInputs.length) {
    return;
  }

  const preferredMode = currentStoragePath ? 'source' : 'snapshot';
  let matched = false;

  for (const input of shareModeInputs) {
    if (!input.disabled && input.value === preferredMode) {
      input.checked = true;
      matched = true;
      break;
    }
  }

  if (!matched) {
    const fallback = shareModeInputs.find((input) => !input.disabled);

    if (fallback) {
      fallback.checked = true;
    }
  }
}

function clearShareFeedback() {
  if (shareLinkGroup) {
    shareLinkGroup.classList.add('hidden');
  }

  if (shareLinkInput) {
    shareLinkInput.value = '';
  }

  if (copyShareLinkButton) {
    copyShareLinkButton.disabled = true;
    copyShareLinkButton.dataset.state = 'default';
    updateCopyShareLinkLabel();
  }

  if (shareErrorElement) {
    delete shareErrorElement.dataset.i18n;
    shareErrorElement.textContent = '';
  }
}

function getSelectedShareMode() {
  const selected = shareModeInputs.find((input) => input.checked);
  return selected?.value ?? 'snapshot';
}

function ensureBpmnExtension(path) {
  return path.endsWith('.bpmn') ? path : `${path}.bpmn`;
}

async function generateSnapshotForShare() {
  const { xml } = await modeler.saveXML({ format: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sharePath = `shared/diagram-${timestamp}.bpmn`;

  const response = await fetch('/api/storage/file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: sharePath, contents: xml })
  });

  if (!response.ok) {
    throw new Error('Failed to store shared diagram');
  }

  return sharePath;
}

function focusShareLink() {
  if (!shareLinkInput) {
    return;
  }

  shareLinkInput.focus();
  shareLinkInput.select();
  shareLinkInput.setSelectionRange(0, shareLinkInput.value.length);
}

async function handleShareSubmit(event) {
  event.preventDefault();

  if (!shareForm || shareOperationInFlight) {
    return;
  }

  clearShareFeedback();

  if (!shareErrorElement) {
    return;
  }

  shareOperationInFlight = true;
  shareForm.classList.add('is-processing');

  if (shareGenerateButton) {
    shareGenerateButton.disabled = true;
  }

  try {
    const mode = getSelectedShareMode();
    let sharePath;

    if (mode === 'source') {
      if (!currentStoragePath) {
        shareErrorElement.dataset.i18n = 'share.error.noSource';
        shareErrorElement.textContent = t('share.error.noSource');
        return;
      }

      sharePath = ensureBpmnExtension(currentStoragePath);
    } else {
      sharePath = await generateSnapshotForShare();
    }

    const shareUrl = new URL('/viewer', window.location.origin);
    shareUrl.searchParams.set('path', sharePath);

    if (shareLinkInput && shareLinkGroup) {
      shareLinkInput.value = shareUrl.toString();
      shareLinkGroup.classList.remove('hidden');

      if (copyShareLinkButton) {
        copyShareLinkButton.disabled = false;
        copyShareLinkButton.dataset.state = 'default';
        updateCopyShareLinkLabel();
      }

      focusShareLink();
    }
  } catch (error) {
    console.error(error);
    shareErrorElement.dataset.i18n = 'share.error.generic';
    shareErrorElement.textContent = t('share.error.generic');
  } finally {
    shareOperationInFlight = false;

    if (shareForm) {
      shareForm.classList.remove('is-processing');
    }

    if (shareGenerateButton) {
      shareGenerateButton.disabled = false;
    }
  }
}

function openShareDialog() {
  if (!shareDialog) {
    return;
  }

  if (typeof shareDialog.showModal !== 'function') {
    alert(t('share.alertUnsupported'));
    return;
  }

  clearShareFeedback();
  updateShareModeAvailability();
  setDefaultShareMode();
  shareDialog.showModal();
}

async function handleCopyShareLink() {
  if (!shareLinkInput || !copyShareLinkButton) {
    return;
  }

  const link = shareLinkInput.value.trim();

  if (!link) {
    return;
  }

  let copied = false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch (error) {
      console.warn('Clipboard copy failed, falling back to manual copy.', error);
    }
  }

  if (!copied) {
    focusShareLink();

    if (typeof document.execCommand === 'function') {
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        console.warn('document.execCommand copy failed.', error);
      }
    }
  }

  if (copied) {
    copyShareLinkButton.dataset.state = 'copied';
    updateCopyShareLinkLabel();

    window.setTimeout(() => {
      if (copyShareLinkButton) {
        copyShareLinkButton.dataset.state = 'default';
        updateCopyShareLinkLabel();
      }
    }, 2000);
  } else if (shareErrorElement) {
    shareErrorElement.dataset.i18n = 'share.error.clipboardUnsupported';
    shareErrorElement.textContent = t('share.error.clipboardUnsupported');
  }
}

function updateCopyShareLinkLabel() {
  if (!copyShareLinkButton) {
    return;
  }

  const state = copyShareLinkButton.dataset.state === 'copied' ? 'copied' : 'default';
  const key = state === 'copied' ? 'share.copied' : 'share.copyLink';
  copyShareLinkButton.textContent = t(key);
}

function clearXmlEditorFeedback() {
  if (!xmlErrorElement) {
    return;
  }

  delete xmlErrorElement.dataset.i18n;
  xmlErrorElement.textContent = '';
}

async function openXmlEditorDialog() {
  if (!editXmlButton || !xmlDialog || !xmlTextarea) {
    return;
  }

  if (typeof xmlDialog.showModal !== 'function') {
    alert(t('xmlEditor.loadError'));
    return;
  }

  try {
    const { xml } = await modeler.saveXML({ format: true });
    xmlTextarea.value = xml;
    clearXmlEditorFeedback();
    xmlDialog.showModal();
    window.requestAnimationFrame(() => {
      xmlTextarea.focus();
      xmlTextarea.setSelectionRange(0, 0);
    });
  } catch (error) {
    console.error('Unable to load XML for editing.', error);
    alert(t('xmlEditor.loadError'));
  }
}

async function handleXmlSubmit(event) {
  event.preventDefault();

  if (!xmlTextarea) {
    return;
  }

  clearXmlEditorFeedback();

  const xml = xmlTextarea.value;

  try {
    await modeler.importXML(xml);
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
    xmlDialog?.close();
  } catch (error) {
    console.error('Failed to import XML from editor.', error);
    if (xmlErrorElement) {
      xmlErrorElement.dataset.i18n = 'xmlEditor.importError';
      xmlErrorElement.textContent = t('xmlEditor.importError');
    }
  }
}

updateShareModeAvailability();
setDefaultShareMode();
clearShareFeedback();

onLocaleChange(() => {
  handleLocaleUpdate();
});

async function bootstrapUi() {
  try {
    await ensureUiConfig();
  } catch (error) {
    console.warn('Unable to load UI configuration. Using defaults.', error);
  }

  initializeLocale();
  initializeTheme();
  renderHeaderLogo(appLogoContainer);
  handleLocaleUpdate();
  closeMoreActionsMenu();
}

bootstrapUi().catch((error) => {
  console.error('Failed to initialize the modeler UI.', error);
});

async function createNewDiagram() {
  try {
    await modeler.importXML(DEFAULT_DIAGRAM);
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
    setDiagramSource(null);
    if (savePathInput) {
      savePathInput.value = '';
    }
  } catch (error) {
    console.error('Failed to import default diagram', error);
    alert(t('notifications.newDiagramFailed'));
  }
}

function openStorageBrowser({ focusSaveInput = false } = {}) {
  closeMoreActionsMenu();
  toggleStorageOverlay(true);

  if (focusSaveInput) {
    focusSavePathInput();
  }
}

async function handleSaveAction({ saveAs = false } = {}) {
  if (!saveAs && currentStoragePath) {
    await saveDiagramToStorage(ensureBpmnExtension(currentStoragePath));
    return;
  }

  openStorageBrowser({ focusSaveInput: true });
}

function openFileImportPicker() {
  closeMoreActionsMenu();

  if (!fileInput) {
    console.warn('File input element is not available.');
    return;
  }

  fileInput.click();
}

async function downloadCurrentDiagram() {
  closeMoreActionsMenu();

  try {
    const { xml } = await modeler.saveXML({ format: true });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    // Use the actual diagram name if available, otherwise fall back to 'diagram.bpmn'
    const diagramName = currentDiagramName?.trim() ? currentDiagramName.trim() : 'diagram';
    anchor.download = `${diagramName}.bpmn`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert(t('notifications.downloadFailed'));
  }
}

const EXPORT_HANDLERS = {
  svg: exportSvg,
  png: exportPng
};

async function handleExport(format) {
  if (exportInFlight) {
    return;
  }

  closeMoreActionsMenu();
  exportInFlight = true;

  try {
    const exportFile = EXPORT_HANDLERS[format];

    if (!exportFile) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const filename = `${sanitizeFilename(getDiagramDisplayName())}.${format}`;
    await exportFile(modeler, filename);
  } catch (error) {
    console.error(error);
    alert(t('notifications.exportFailed'));
  } finally {
    exportInFlight = false;
  }
}

function triggerUndo() {
  try {
    const commandStack = modeler.get('commandStack');
    if (typeof commandStack?.undo === 'function') {
      commandStack.undo();
    }
  } catch (error) {
    console.error('Undo operation failed.', error);
  }
}

function triggerRedo() {
  try {
    const commandStack = modeler.get('commandStack');
    if (typeof commandStack?.redo === 'function') {
      commandStack.redo();
    }
  } catch (error) {
    console.error('Redo operation failed.', error);
  }
}

function updateUndoRedoButtons() {
  if (!undoButton || !redoButton) return;

  try {
    const commandStack = modeler.get('commandStack');
    if (commandStack) {
      undoButton.disabled = typeof commandStack.canUndo === 'function'
        ? !commandStack.canUndo()
        : true;
      redoButton.disabled = typeof commandStack.canRedo === 'function'
        ? !commandStack.canRedo()
        : true;
    }
  } catch (error) {
    console.warn('Unable to update undo/redo buttons.', error);
  }
}

function removeSelectedElements() {
  if (!selectedElements.length) {
    return;
  }

  try {
    const editorActions = modeler.get('editorActions');
    if (typeof editorActions?.trigger === 'function') {
      editorActions.trigger('removeSelection');
    }
  } catch (error) {
    console.error('Failed to delete selected elements.', error);
  }
}

function updateDeleteButtonState() {
  if (!deleteButton) return;

  deleteButton.disabled = selectedElements.length === 0;
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target instanceof HTMLInputElement) {
    const editableTypes = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'];
    return editableTypes.includes(target.type) && !target.readOnly && !target.disabled;
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }

  if (target.closest('[contenteditable="true"]')) {
    return true;
  }

  return false;
}

function handleKeyboardShortcuts(event) {
  // Use event.code (physical key) so shortcuts work with any keyboard layout
  const code = event.code;
  const editableTarget = isEditableTarget(event.target);

  const direction = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowRight: { x: 1, y: 0 },
    ArrowDown: { x: 0, y: 1 }
  }[code];

  if (
    direction
    && selectedElements.length
    && !editableTarget
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
  ) {
    const step = event.shiftKey ? 10 : 1;

    event.preventDefault();
    modeler.get('modeling').moveElements(selectedElements, {
      x: direction.x * step,
      y: direction.y * step
    });
    return;
  }

  // Delete selected elements via the Delete or Backspace key
  if (
    (code === 'Delete' || code === 'Backspace')
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
  ) {
    if (editableTarget || event.defaultPrevented) {
      return;
    }

    event.preventDefault();
    removeSelectedElements();
    return;
  }

  const hasModifier = event.ctrlKey || event.metaKey;

  if (!hasModifier || event.defaultPrevented) {
    return;
  }

  if (editableTarget && (code === 'KeyZ' || code === 'KeyY')) {
    return;
  }

  switch (code) {
    case 'KeyZ':
      event.preventDefault();
      if (event.shiftKey) {
        triggerRedo();
      } else {
        triggerUndo();
      }
      break;
    case 'KeyY':
      event.preventDefault();
      triggerRedo();
      break;
    case 'KeyS':
      event.preventDefault();
      void handleSaveAction({ saveAs: event.shiftKey });
      break;
    case 'KeyO':
      event.preventDefault();
      if (event.shiftKey) {
        openStorageBrowser();
      } else {
        openFileImportPicker();
      }
      break;
    case 'KeyN':
      event.preventDefault();
      createNewDiagram();
      break;
    default:
      return;
  }
}

function toggleStorageOverlay(force) {
  const shouldShow = typeof force === 'boolean' ? force : fileBrowser.classList.contains('hidden');
  fileBrowser.classList.toggle('hidden', !shouldShow);
  fileBrowser.setAttribute('aria-hidden', String(!shouldShow));
  if (shouldShow) {
    refreshStorageTree();
  }
}

async function refreshStorageTree() {
  try {
    const response = await fetch('/api/storage/tree');

    if (!response.ok) {
      throw new Error('Failed to load storage tree');
    }

    const tree = await response.json();
    renderTree(tree.children ?? []);
  } catch (error) {
    console.error(error);
    renderStorageMessage('storage.failed');
  }
}

function renderTree(nodes) {
  if (!storageTree) {
    return;
  }

  storageTree.innerHTML = '';

  if (!nodes.length) {
    renderStorageMessage('storage.empty', 'storage-hint');
    return;
  }

  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    fragment.appendChild(createTreeNode(node));
  });

  storageTree.appendChild(fragment);
}

function renderStorageMessage(key, className) {
  if (!storageTree) {
    return;
  }

  storageTree.innerHTML = '';
  const messageItem = document.createElement('li');

  if (className) {
    messageItem.className = className;
  }

  messageItem.dataset.i18n = key;
  messageItem.textContent = t(key);
  storageTree.appendChild(messageItem);
}

function focusSavePathInput() {
  if (!savePathInput) {
    return;
  }

  requestAnimationFrame(() => {
    savePathInput.focus();
    savePathInput.select();
  });
}

function updateSaveButtonState() {
  if (!saveButton) {
    return;
  }

  const hasStoragePath = Boolean(currentStoragePath);
  const ariaLabelKey = hasStoragePath ? 'actions.saveDiagram.ariaLabel' : 'actions.saveDiagram.ariaLabelUnsaved';
  const titleKey = hasStoragePath ? 'actions.saveDiagram.title' : 'actions.saveDiagram.titleUnsaved';

  saveButton.dataset.mode = hasStoragePath ? 'save' : 'save-as';
  saveButton.setAttribute('aria-label', t(ariaLabelKey));
  saveButton.setAttribute('title', t(titleKey));
}

function populateLanguageSelect() {
  if (!languageSelect) {
    return;
  }

  const locales = getAvailableLocales();
  const current = getCurrentLocale();

  languageSelect.innerHTML = '';

  locales.forEach((locale) => {
    const option = document.createElement('option');
    option.value = locale;
    option.dataset.i18n = `language.options.${locale}`;
    option.textContent = t(`language.options.${locale}`);
    languageSelect.appendChild(option);
  });

  if (locales.includes(current)) {
    languageSelect.value = current;
  }
}

function handleLocaleUpdate() {
  populateLanguageSelect();
  applyTranslations();
  const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  updateThemeToggle(currentTheme);
  updateDiagramTitle();
  updateCopyShareLinkLabel();
  updateSaveButtonState();
  updateMoreActionsToggleAria();
}

function createTreeNode(node) {
  const li = document.createElement('li');
  const item = document.createElement('div');
  item.className = 'tree-item';
  item.dataset.path = node.path;
  item.dataset.type = node.type;

  const label = document.createElement('div');
  label.className = 'label';
  const icon = document.createElement('span');
  icon.textContent = node.type === 'directory' ? '📁' : '📄';
  const text = document.createElement('span');
  text.textContent = node.name;
  label.append(icon, text);

  if (node.type === 'directory') {
    const caret = document.createElement('span');
    caret.className = 'tree-caret';
    caret.textContent = '▸';
    caret.setAttribute('aria-hidden', 'true');
    label.prepend(caret);
    item.appendChild(label);

    let childrenUl = null;
    let expanded = false;
    let rendered = false;

    const toggleDirectory = () => {
      expanded = !expanded;
      caret.textContent = expanded ? '▾' : '▸';
      item.classList.toggle('expanded', expanded);

      if (expanded && !rendered) {
        childrenUl = buildChildrenList(node.children ?? []);
        li.appendChild(childrenUl);
        rendered = true;
      }

      if (childrenUl) {
        childrenUl.classList.toggle('hidden', !expanded);
      }
    };

    item.addEventListener('click', (event) => {
      event.stopPropagation();
      setActiveTreeNode(item);
      toggleDirectory();
      const prefix = node.path ? `${node.path.replace(/\\/g, '/')}/` : '';
      savePathInput.value = prefix;
    });

    li.appendChild(item);
    return li;
  }

  item.appendChild(label);

  const actions = document.createElement('div');
  actions.className = 'tree-item-actions';

  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'tree-item-rename-button';
  renameBtn.title = t('actions.renameFile.title');
  renameBtn.setAttribute('aria-label', t('actions.renameFile.ariaLabel'));
  renameBtn.innerHTML = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>`;

  renameBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    await renameFileFromStorage(node.path);
  });

  actions.appendChild(renameBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'tree-item-delete-button';
  deleteBtn.title = t('actions.deleteFile.title');
  deleteBtn.setAttribute('aria-label', t('actions.deleteFile.ariaLabel'));
  deleteBtn.innerHTML = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18"/>
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>`;

  deleteBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    const confirmed = confirm(t('prompts.confirmDeleteFile', { name: node.name }));
    if (!confirmed) {
      return;
    }
    await deleteFileFromStorage(node.path);
  });

  actions.appendChild(deleteBtn);

  item.appendChild(actions);

  item.addEventListener('click', async () => {
    await loadDiagramFromStorage(node.path);
    setActiveTreeNode(item);
    toggleStorageOverlay(false);
  });

  li.appendChild(item);

  return li;
}

function buildChildrenList(children) {
  const ul = document.createElement('ul');
  ul.className = 'tree-children hidden';

  if (children.length) {
    children.forEach((child) => {
      ul.appendChild(createTreeNode(child));
    });
  } else {
    const empty = document.createElement('li');
    empty.className = 'tree-empty';
    empty.textContent = t('storage.empty');
    ul.appendChild(empty);
  }

  return ul;
}

function setActiveTreeNode(element) {
  if (currentActiveNode) {
    currentActiveNode.classList.remove('active');
  }

  currentActiveNode = element;

  if (currentActiveNode) {
    currentActiveNode.classList.add('active');
  }
}

async function loadDiagramFromStorage(path) {
  try {
    const response = await fetch(`/api/storage/file?${new URLSearchParams({ path })}`);

    if (!response.ok) {
      throw new Error('Failed to load diagram');
    }

    const { contents } = await response.json();
    await modeler.importXML(contents);
    modeler.get('canvas').zoom('fit-viewport');
    const normalizedPath = normalizeStoragePath(path);
    setDiagramSource(normalizedPath);
    if (savePathInput) {
      savePathInput.value = normalizedPath;
    }

    return true;
  } catch (error) {
    console.error(error);
    alert(t('notifications.loadFromStorageFailed'));

    return false;
  }
}

async function saveDiagramToStorage(path) {
  cancelAutoSave();
  try {
    const { xml } = await modeler.saveXML({ format: true });
    const response = await fetch('/api/storage/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path, contents: xml })
    });

    if (!response.ok) {
      throw new Error('Failed to save diagram');
    }

    await refreshStorageTree();
    setDiagramSource(path);
    if (savePathInput) {
      savePathInput.value = path;
    }
    alert(t('notifications.saveSuccess'));
  } catch (error) {
    console.error(error);
    alert(t('notifications.saveFailed'));
  }
}

async function renameFileFromStorage(path) {
  const normalizedPath = normalizeStoragePath(path);
  const segments = normalizedPath.split('/');
  const currentName = segments.pop() || '';
  const directory = segments.filter(Boolean).join('/');
  const extensionMatch = currentName.match(/(\.[^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : '.bpmn';
  const currentBase = currentName.slice(0, currentName.length - extension.length);

  const newName = prompt(t('prompts.renameFile', { name: currentBase }), currentBase);

  if (newName === null) {
    return;
  }

  const trimmed = newName.trim();

  if (!trimmed) {
    alert(t('notifications.renameFailed'));
    return;
  }

  const finalName = trimmed.toLowerCase().endsWith(extension.toLowerCase()) ? trimmed : `${trimmed}${extension}`;
  const newPath = directory ? `${directory}/${finalName}` : finalName;

  if (newPath === normalizedPath) {
    return;
  }

  try {
    const response = await fetch('/api/storage/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: normalizedPath, newPath })
    });

    if (!response.ok) {
      throw new Error('Failed to rename file');
    }

    if (currentStoragePath === normalizedPath) {
      setDiagramSource(newPath);
      if (savePathInput) {
        savePathInput.value = newPath;
      }
    }

    await refreshStorageTree();
    alert(t('notifications.fileRenamed'));
  } catch (error) {
    console.error(error);
    alert(t('notifications.renameFailed'));
  }
}

async function deleteFileFromStorage(path) {
  try {
    const normalizedPath = normalizeStoragePath(path);
    const response = await fetch(`/api/storage/file?${new URLSearchParams({ path: normalizedPath })}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }

    if (currentStoragePath === normalizedPath) {
      setDiagramSource(null);
      if (savePathInput) {
        savePathInput.value = '';
      }
    }

    await refreshStorageTree();
    alert(t('notifications.fileDeleted'));
  } catch (error) {
    console.error(error);
    alert(t('notifications.fileDeleteFailed'));
  }
}

async function createFolder(path) {
  try {
    const response = await fetch('/api/storage/directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    });

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    await refreshStorageTree();
    alert(t('notifications.folderCreated'));
  } catch (error) {
    console.error(error);
    alert(t('notifications.folderCreateFailed'));
  }
}

languageSelect?.addEventListener('change', (event) => {
  const target = event.target;

  if (target instanceof HTMLSelectElement) {
    setLocale(target.value);
  }
});

moreActionsToggle?.addEventListener('click', () => {
  setMoreActionsOpen(!isMoreActionsOpen);
});

moreActionsMenu?.addEventListener('click', (event) => {
  const target = event.target;

  if (target instanceof Element) {
    const closeTrigger = target.closest('[data-close-menu]');

    if (closeTrigger) {
      closeMoreActionsMenu();
    }
  }
});

newDiagramButton?.addEventListener('click', () => {
  createNewDiagram();
});

importButton?.addEventListener('click', () => {
  openFileImportPicker();
});

fileInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    await modeler.importXML(text);
    modeler.get('canvas').zoom('fit-viewport');
    const suggestedPath = file.name.replace(/\.xml$/i, '.bpmn');
    if (savePathInput) {
      savePathInput.value = suggestedPath;
    }
    setDiagramSource(null, deriveNameFromPath(suggestedPath));
  } catch (error) {
    console.error(error);
    alert(t('notifications.importFailed'));
  } finally {
    event.target.value = '';
  }
});

downloadButton?.addEventListener('click', () => {
  void downloadCurrentDiagram();
});

exportSvgButton?.addEventListener('click', () => {
  void handleExport('svg');
});

exportPngButton?.addEventListener('click', () => {
  void handleExport('png');
});

editXmlButton?.addEventListener('click', () => {
  closeMoreActionsMenu();
  void openXmlEditorDialog();
});

saveButton?.addEventListener('click', () => {
  void handleSaveAction();
});

shareButton?.addEventListener('click', () => {
  openShareDialog();
});

shareCancelButton?.addEventListener('click', () => {
  shareDialog?.close();
});

shareForm?.addEventListener('submit', (event) => {
  void handleShareSubmit(event);
});

shareForm?.addEventListener('change', (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.name === 'share-mode') {
    clearShareFeedback();
    if (shareErrorElement) {
      shareErrorElement.textContent = '';
    }
  }
});

copyShareLinkButton?.addEventListener('click', () => {
  void handleCopyShareLink();
});

shareDialog?.addEventListener('close', () => {
  shareOperationInFlight = false;

  if (shareForm) {
    shareForm.classList.remove('is-processing');
  }

  if (shareGenerateButton) {
    shareGenerateButton.disabled = false;
  }

  clearShareFeedback();
  setDefaultShareMode();
});

xmlCancelButton?.addEventListener('click', () => {
  xmlDialog?.close();
});

xmlDialog?.addEventListener('close', () => {
  clearXmlEditorFeedback();
});

xmlForm?.addEventListener('submit', (event) => {
  void handleXmlSubmit(event);
});

zoomInButton?.addEventListener('click', () => {
  try {
    const zoomScroll = modeler.get('zoomScroll');
    if (typeof zoomScroll?.stepZoom === 'function') {
      zoomScroll.stepZoom(1);
    }
  } catch (error) {
    console.error('Unable to zoom in.', error);
  }
});

zoomOutButton?.addEventListener('click', () => {
  try {
    const zoomScroll = modeler.get('zoomScroll');
    if (typeof zoomScroll?.stepZoom === 'function') {
      zoomScroll.stepZoom(-1);
    }
  } catch (error) {
    console.error('Unable to zoom out.', error);
  }
});

zoomFitButton?.addEventListener('click', () => {
  try {
    const canvas = modeler.get('canvas');

    if (!canvas) {
      return;
    }

    canvas.zoom('fit-viewport', 'auto');
  } catch (error) {
    console.error('Unable to fit diagram to viewport.', error);
  }
});

undoButton?.addEventListener('click', () => {
  triggerUndo();
});

redoButton?.addEventListener('click', () => {
  triggerRedo();
});

deleteButton?.addEventListener('click', () => {
  removeSelectedElements();
});

storageToggle?.addEventListener('click', () => toggleStorageOverlay());
closeStorage?.addEventListener('click', () => toggleStorageOverlay(false));

window.addEventListener('keydown', handleKeyboardShortcuts, true);

modeler.on('import.done', () => {
  updateDiagramTitle();
});

modeler.on('commandStack.changed', () => {
  updateDiagramTitle();
});

modeler.on('commandStack.changed', () => {
  triggerAutoSave();
});

modeler.on('commandStack.changed', () => {
  updateUndoRedoButtons();
});

modeler.on('selection.changed', (event) => {
  selectedElements = event.newSelection || [];
  updateColorFillButtonState();
  updateDeleteButtonState();
  updateActiveColorFromSelection();
  closeColorFillMenu();
});

// Initialize undo/redo and delete button states
updateUndoRedoButtons();
updateDeleteButtonState();

// Process validation UI
setupProcessCheckUI({
  modeler,
  validateButton,
  validateMenu,
  t,
  onLocaleChange
});

colorFillButton?.addEventListener('click', () => {
  setColorFillOpen(!isColorFillOpen);
});

colorFillMenu?.addEventListener('click', (event) => {
  const swatch = event.target.closest('.color-swatch');
  if (!swatch) return;

  const color = swatch.dataset.color || null;
  applyColorToSelection(color);
});

colorFillMenu?.addEventListener('pointerdown', (event) => {
  // Prevent the pointerdown from closing the menu
  event.stopPropagation();
});

themeToggle?.addEventListener('click', (event) => {
  if (event.shiftKey) {
    clearStoredTheme();
    applyTheme(prefersDarkScheme.matches ? 'dark' : 'light');
    return;
  }

  const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  writeStoredTheme(nextTheme);
});

saveForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const path = savePathInput.value.trim();

  if (!path) {
    alert(t('prompts.provideFilePath'));
    return;
  }

  await saveDiagramToStorage(path.endsWith('.bpmn') ? path : `${path}.bpmn`);
});

folderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const path = folderPathInput.value.trim();

  if (!path) {
    alert(t('prompts.provideFolderPath'));
    return;
  }

  await createFolder(path);
  folderPathInput.value = '';
});

async function initializeDiagram() {
  const params = new URLSearchParams(window.location.search);
  const identifier = params.get('diagram');

  if (!identifier || identifier === 'new') {
    await createNewDiagram();
    return;
  }

  const normalizedIdentifier = normalizeStoragePath(identifier).trim();

  if (!normalizedIdentifier) {
    await createNewDiagram();
    return;
  }

  const candidatePath = ensureBpmnExtension(normalizedIdentifier);
  const loaded = await loadDiagramFromStorage(candidatePath);

  if (!loaded) {
    await createNewDiagram();
  }
}

void initializeDiagram();
