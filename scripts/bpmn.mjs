#!/usr/bin/env node
/**
 * BPMN tool for the Favorit editor.
 *
 *   node scripts/bpmn.mjs layout <file.bpmn> [-o out.bpmn]   build the DI section
 *   node scripts/bpmn.mjs check  <file.bpmn>                 validate the file
 *   node scripts/bpmn.mjs push   <path in editor>            layout + validate + save + read back
 *
 * The editor is the storage of record: `push` reads the file from the editor,
 * lays it out, validates it, saves it and reads it back to prove the save.
 */
import { readFileSync, writeFileSync } from 'fs';
import { layoutBpmnXml } from '../server/bpmn-layout.js';
import { checkBpmnXml, formatReport } from '../server/bpmn-check.js';

const SERVER = process.env.BPMN_SERVER || 'http://localhost:3000';

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { server: SERVER, out: null };
  const positional = [];

  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (item === '-o' || item === '--out') {
      options.out = rest[i + 1];
      i += 1;
    } else if (item === '--server') {
      options.server = rest[i + 1];
      i += 1;
    } else {
      positional.push(item);
    }
  }

  return { command, positional, options };
}

async function readFromEditor(server, path) {
  const response = await fetch(`${server}/api/storage/file?path=${encodeURIComponent(path)}`);
  if (!response.ok) {
    throw new Error(`GET /api/storage/file → ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  return payload.contents;
}

async function writeToEditor(server, path, contents) {
  const response = await fetch(`${server}/api/storage/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contents })
  });
  if (!response.ok) {
    throw new Error(`POST /api/storage/file → ${response.status} ${await response.text()}`);
  }
}

function printReport(result) {
  process.stdout.write(`${formatReport(result)}\n`);
}

async function main() {
  const { command, positional, options } = parseArgs(process.argv.slice(2));

  if (!command || command === 'help') {
    process.stdout.write([
      'Использование:',
      '  node scripts/bpmn.mjs layout <file.bpmn> [-o out.bpmn]',
      '  node scripts/bpmn.mjs check  <file.bpmn>',
      '  node scripts/bpmn.mjs push   <path в редакторе> [--server http://localhost:3000]',
      ''
    ].join('\n'));
    return 0;
  }

  if (command === 'layout') {
    const file = positional[0];
    if (!file) throw new Error('Укажите файл: node scripts/bpmn.mjs layout <file.bpmn>');
    const xml = readFileSync(file, 'utf8');
    const result = await layoutBpmnXml(xml);
    if (options.out) {
      writeFileSync(options.out, result, 'utf8');
      process.stdout.write(`DI построен: ${options.out}\n`);
    } else {
      process.stdout.write(result);
    }
    return 0;
  }

  if (command === 'check') {
    const file = positional[0];
    if (!file) throw new Error('Укажите файл: node scripts/bpmn.mjs check <file.bpmn>');
    const result = await checkBpmnXml(readFileSync(file, 'utf8'));
    printReport(result);
    return result.summary.error > 0 ? 1 : 0;
  }

  if (command === 'push') {
    const path = positional[0];
    if (!path) throw new Error('Укажите путь в редакторе: node scripts/bpmn.mjs push <path>');

    const original = await readFromEditor(options.server, path);
    const laidOut = await layoutBpmnXml(original);
    const result = await checkBpmnXml(laidOut);
    printReport(result);
    if (result.summary.error > 0) {
      process.stderr.write('Файл не сохранён: в схеме есть ошибки.\n');
      return 1;
    }

    await writeToEditor(options.server, path, laidOut);
    const saved = await readFromEditor(options.server, path);
    if (saved !== laidOut) {
      throw new Error('Обратное чтение не совпало с сохранённым содержимым.');
    }

    process.stdout.write([
      `Сохранено: ${path}`,
      `Проверено обратным чтением: ${saved.length} байт`,
      `Ссылка: ${options.server}/?diagram=${encodeURIComponent(path)}`,
      ''
    ].join('\n'));
    return 0;
  }

  throw new Error(`Неизвестная команда: ${command}`);
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`Ошибка: ${error.message}\n`);
  process.exitCode = 1;
}
