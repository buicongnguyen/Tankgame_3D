import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Run against a local Vite server. This is a repeatable CPU/draw-call diagnostic,
// not a physical-device FPS benchmark or a change to normal game balance.
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const url = new URL(option('--url', 'http://127.0.0.1:5184/'));
url.searchParams.set('e2e', '');
const output = resolve(option('--output', 'test-results/battle-profile.json'));
await mkdir(dirname(output), { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const low of [false, true]) {
    for (const baseline of [true, false]) {
      const page = await browser.newPage({ viewport: low ? { width: 844, height: 390 } : { width: 1440, height: 900 } });
      try {
        await page.goto(url.href);
        await page.waitForFunction(() => window.__steel?.phase === 'menu');
        const result = await page.evaluate(async ({ low, baseline }) => {
          const game = window.__steel;
          game.frame = () => {};
          await game.world.load(low);
          game.world.settings(low);
          let seed = 12345;
          Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
          if (baseline) {
            game.world.enemyBatches.clear();
            game.world.enemyBatches.add = () => {};
          }
          game.save.difficulty = 'crazy';
          game.start(13, 2);
          game.player.hp = game.player.max = 1e8;
          game.player.visual.root.position.set(0, 0, 0);
          for (const unit of game.enemies) if (unit.encounter) unit.encounter.active = true;
          game.world.target.copy(game.player.visual.root.position);
          const samples = [], draws = [];
          for (let i = 0; i < 90; i++) {
            const start = performance.now();
            game.step(1 / 60);
            const simulated = performance.now();
            game.world.update(1 / 60, game.player.visual.root.position);
            const rendered = performance.now();
            if (i >= 10) {
              samples.push({ simulation: simulated - start, worldAndRenderSubmission: rendered - simulated });
              draws.push(game.world.renderer.info.render.calls);
            }
          }
          const stats = key => {
            const sorted = samples.map(s => s[key]).sort((a, b) => a - b);
            return { medianMs: +sorted[Math.floor(sorted.length * .5)].toFixed(2), p95Ms: +sorted[Math.floor(sorted.length * .95)].toFixed(2) };
          };
          return {
            preset: low ? 'mobile-low' : 'desktop-detailed', batching: !baseline,
            enemies: game.enemies.length, covers: game.world.covers.length,
            simulation: stats('simulation'), worldAndRenderSubmission: stats('worldAndRenderSubmission'),
            drawCalls: Math.round(draws.reduce((a, b) => a + b, 0) / draws.length),
          };
        }, { low, baseline });
        results.push(result);
        console.log(JSON.stringify(result));

      } finally { await page.close(); }
    }
  }
  await writeFile(output, JSON.stringify({ renderer: 'Chromium SwiftShader (software GPU)', warmupFrames: 10, measuredFrames: 80, results }, null, 2) + '\n');
} finally { await browser.close(); }
