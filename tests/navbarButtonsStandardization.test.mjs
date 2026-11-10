import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Navbar buttons standardization: all right-hand floating HUD buttons share glassmorphism and tactile feedback', () => {
  const navbarSrc = readSource('src/components/layout/Navbar.tsx');
  const templatesSrc = readSource('src/components/whiteboard/SprintTemplatesModal.tsx');
  const facilitationSrc = readSource('src/components/whiteboard/FacilitationMenu.tsx');
  const preferencesSrc = readSource('src/components/whiteboard/CanvasPreferencesMenu.tsx');
  const coffeeSrc = readSource('src/components/layout/BuyMeACoffeeModal.tsx');

  // 1. Templates trigger standardization
  assert.match(templatesSrc, /bg-background\/80 dark:bg-card\/80 backdrop-blur-md/);
  assert.match(templatesSrc, /border border-border/);
  assert.match(templatesSrc, /active:scale-\[0\.97\]/);
  assert.match(templatesSrc, /group-hover:scale-105/);
  assert.match(templatesSrc, /<TooltipContent>Inserir Templates de Sprint<\/TooltipContent>/);

  // 2. BuyMeACoffeeModal (Apoiar) trigger standardization
  assert.match(coffeeSrc, /bg-background\/80 dark:bg-card\/80 backdrop-blur-md/);
  assert.match(coffeeSrc, /border border-border/);
  assert.match(coffeeSrc, /active:scale-\[0\.97\]/);
  assert.match(coffeeSrc, /<TooltipContent>Apoiar o Projeto Mirio \(PIX\)<\/TooltipContent>/);

  // 3. FacilitationMenu (Facilitação & Atividades) trigger standardization
  assert.match(facilitationSrc, /bg-background\/80 dark:bg-card\/80 backdrop-blur-md/);
  assert.match(facilitationSrc, /border border-border/);
  assert.match(facilitationSrc, /active:scale-\[0\.97\]/);
  assert.match(facilitationSrc, /hover:bg-muted\/80/);

  // 4. CanvasPreferencesMenu (Preferências) trigger standardization
  assert.match(preferencesSrc, /bg-background\/80 dark:bg-card\/80 backdrop-blur-md/);
  assert.match(preferencesSrc, /border border-border/);
  assert.match(preferencesSrc, /active:scale-\[0\.97\]/);
  assert.match(preferencesSrc, /hover:bg-muted\/80/);

  // 5. Compartilhar (Share) button in Navbar
  assert.match(navbarSrc, /aria-label="Compartilhar Quadro"[\s\S]*?bg-background\/80 dark:bg-card\/80 backdrop-blur-md/);
  assert.match(navbarSrc, /aria-label="Compartilhar Quadro"[\s\S]*?active:scale-\[0\.97\]/);

  // 6. Sair (Logout) button in Navbar
  assert.match(navbarSrc, /aria-label="Sair da Conta"[\s\S]*?bg-background\/80 dark:bg-card\/80 backdrop-blur-md/);
  assert.match(navbarSrc, /aria-label="Sair da Conta"[\s\S]*?active:scale-\[0\.97\]/);

  // 7. Avatars container in Navbar
  assert.match(navbarSrc, /bg-background\/80 dark:bg-card\/80 backdrop-blur-md px-2 py-1 rounded-lg shadow-xs border border-border/);
});
