import fs from 'node:fs';
import path from 'node:path';

const index = fs.readFileSync('dist/index.html', 'utf8');
if (!index.includes('SA Educate') || !index.includes('id="root"')) {
  throw new Error('React entry point missing');
}
const files = fs.readdirSync('dist/assets');
if (!files.some(file => file.endsWith('.js')) || !files.some(file => file.endsWith('.css'))) {
  throw new Error('Built React bundle missing');
}
for (const name of [
  'hero-educator.png', 'logo-egov.png', 'logo-dbe.png', 'logo-dhet.png',
  'logo-sita.png', 'logo-nsfas.png', 'dashboard-preview.png',
  'accessibility-preview.png', 'progress-preview.png',
]) {
  if (!fs.existsSync(path.join('dist', 'assets', name))) throw new Error(`Missing visual asset: ${name}`);
}
console.log('React build and landing-page assets verified.');
