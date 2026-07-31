const DEFAULT_PNG_SCALE = 2;
const SVG_MIME_TYPE = 'image/svg+xml;charset=utf-8';
const PNG_MIME_TYPE = 'image/png';
const FALLBACK_FILENAME = 'diagram';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitizeFilename(name) {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/^\.+/, '')
    .trim();

  return cleaned || FALLBACK_FILENAME;
}

export async function exportSvg(modeler, filename) {
  const { svg } = await modeler.saveSVG();
  downloadBlob(new Blob([svg], { type: SVG_MIME_TYPE }), filename);
}

function getSvgSize(svg) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const svgElement = doc.documentElement;

  return {
    width: parseFloat(svgElement.getAttribute('width')) || 0,
    height: parseFloat(svgElement.getAttribute('height')) || 0
  };
}

async function rasterizeSvg(svg, scale, Canvg) {
  const { width, height } = getSvgSize(svg);

  if (!(width > 0) || !(height > 0)) {
    throw new Error('Diagram has no renderable content.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  context.scale(scale, scale);

  const canvg = await Canvg.from(context, svg, {
    ignoreAnimation: true,
    ignoreMouse: true,
    ignoreDimensions: true
  });

  await canvg.render();
  canvg.stop();

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to rasterize the diagram to a PNG blob.'));
      }
    }, PNG_MIME_TYPE);
  });
}

export async function exportPng(modeler, filename, { scale = DEFAULT_PNG_SCALE } = {}) {
  const { Canvg } = await import('canvg');
  const { svg } = await modeler.saveSVG();
  const canvas = await rasterizeSvg(svg, scale, Canvg);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, filename);
}
