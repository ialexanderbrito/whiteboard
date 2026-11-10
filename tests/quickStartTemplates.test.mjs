import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('sprintTemplates exports expanded catalog with role categories and diagram generators', () => {
  const src = readSource('src/utils/sprintTemplates.ts');
  assert.match(src, /export const TEMPLATE_CATEGORIES/);
  assert.match(src, /id:\s*'flowchart_architecture'/);
  assert.match(src, /id:\s*'roadmap_planning'/);
  assert.match(src, /id:\s*'wireframe_prototype'/);
  assert.match(src, /id:\s*'retro_4ls'/);
  assert.match(src, /type:\s*'diamond'/);
  assert.match(src, /type:\s*'arrow'/);
});

test('QuickStartTemplatesStrip implements collapsible header, role filter, clean Blank board card, and 1-click template cards without modal friction', () => {
  const src = readSource('src/components/whiteboard/QuickStartTemplatesStrip.tsx');
  assert.match(src, /Comece algo novo/);
  assert.match(src, /Templates para:/);
  assert.match(src, /Quadro em branco/);
  assert.match(src, /onQuickCreateFromTemplate\(tmpl\)/);
  assert.doesNotMatch(src, /onConfigureTemplate/);
  assert.match(src, /mirio_quick_templates_collapsed/);
});

test('DashboardPage creates blank boards and template boards in 1 click without opening CreateBoardModal', () => {
  const src = readSource('src/pages/DashboardPage.tsx');
  assert.match(src, /<QuickStartTemplatesStrip/);
  assert.match(src, /const handleCreateBlankBoard = async \(\) =>/);
  assert.match(src, /title:\s*'Quadro sem título'/);
  assert.match(src, /generateTemplateElements/);
  assert.match(src, /elementService\.batchAddElements\(boardId,\s*withIds\)/);
  assert.match(src, /onCreateFromTemplate:\s*handleQuickCreateFromTemplate/);
  assert.doesNotMatch(src, /<CreateBoardModal/);
});
