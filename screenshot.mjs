import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, 'dist');
const output = path.join(here, 'qa');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml' };
await fs.mkdir(output, { recursive: true });

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const target = path.resolve(root, '.' + pathname);
  if (target !== root && !target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const file = target === root ? path.join(root, 'index.html') : target;
    const data = await fs.readFile(file);
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404).end('Not found'); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1875, height: 1000 }, deviceScaleFactor: 1 });
  const url = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(url, { waitUntil: 'networkidle' });
  if (process.argv.includes('--font-variants')) {
    const variants = [
      ['fredoka600', ".brand,.hero h1,.section-heading h2,.dashboard-copy h2,.access-copy h2,.progress-copy h2,.benefits-section h2,.faq-section h2,.final-cta h2{font-family:'Fredoka'!important;font-weight:600!important;letter-spacing:-.025em!important}"],
      ['nunito900', ".brand,.hero h1,.section-heading h2,.dashboard-copy h2,.access-copy h2,.progress-copy h2,.benefits-section h2,.faq-section h2,.final-cta h2{font-family:'Nunito'!important;font-weight:900!important;letter-spacing:-.045em!important}"],
    ];
    for (const [name, css] of variants) {
      const tag = await page.addStyleTag({ content: css });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, `${name}.png`), clip: { x: 0, y: 0, width: 1875, height: 1426 } });
      await tag.evaluate(element => element.remove());
    }
  } else {
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    console.log(JSON.stringify({ desktop: path.join(output, 'desktop.png'), height: await page.evaluate(() => document.documentElement.scrollHeight) }));
    assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true, 'All landing-page images load');
    const carousel = page.locator('.logo-viewport');
    assert.equal(await page.locator('.collaborators').evaluate(element => Math.round(element.getBoundingClientRect().height)), 171);
    const movingFrom = await carousel.evaluate(element => element.scrollLeft);
    await page.waitForTimeout(400);
    const movingTo = await carousel.evaluate(element => element.scrollLeft);
    assert.ok(movingTo > movingFrom, 'Carousel moves continuously');
    await page.getByRole('button', { name: 'Next logos' }).click();
    await page.waitForTimeout(600);
    const afterNext = await carousel.evaluate(element => element.scrollLeft);
    assert.ok(afterNext > movingTo + 50, 'Next arrow advances the carousel');
    await carousel.evaluate(element => {
      const width = element.querySelector('.logo-set').getBoundingClientRect().width;
      element.scrollLeft = width * 2 + 5;
    });
    await page.waitForTimeout(80);
    assert.equal(await carousel.evaluate(element => {
      const width = element.querySelector('.logo-set').getBoundingClientRect().width;
      return element.scrollLeft >= width && element.scrollLeft < width * 2;
    }), true, 'Carousel wraps without reaching an end');
    const beforePrevious = await carousel.evaluate(element => {
      const width = element.querySelector('.logo-set').getBoundingClientRect().width;
      const item = element.querySelector('.logo-item').getBoundingClientRect().width;
      element.scrollLeft = width + item * 2;
      return element.scrollLeft;
    });
    await page.getByRole('button', { name: 'Previous logos' }).click();
    await page.waitForTimeout(600);
    assert.ok(await carousel.evaluate(element => element.scrollLeft) < beforePrevious - 50, 'Previous arrow moves backwards');
    await page.getByRole('button', { name: 'Can I edit generated lessons?' }).click();
    assert.equal(await page.getByText('Yes. You can review and edit a lesson before assigning it to a class.').isVisible(), true);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.getByRole('button', { name: 'Close' }).click();
    console.log('Desktop interactions passed');
    const responsiveWidths = [1440, 1024, 768, 390, 320];
    for (const width of responsiveWidths) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.reload({ waitUntil: 'networkidle' });
      const filename = width === 390 ? 'mobile.png' : `responsive-${width}.png`;
      await page.screenshot({ path: path.join(output, filename), fullPage: true });
      const layout = await page.evaluate(() => ({
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        sections: [...document.querySelectorAll('main > section')].every(section => {
          const rect = section.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }),
      }));
      assert.ok(layout.scrollWidth <= layout.viewport, `No horizontal overflow at ${width}px`);
      assert.equal(layout.sections, true, `All sections have visible dimensions at ${width}px`);
      console.log(JSON.stringify({ width, screenshot: path.join(output, filename), height: layout.height }));
    }
    console.log('Responsive layout passed at 1440, 1024, 768, 390 and 320 pixels');
  }
} finally {
  await browser?.close();
  server.close();
}
