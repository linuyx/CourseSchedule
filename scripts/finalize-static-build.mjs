import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(projectRoot, 'dist', 'client', 'index.html');

const html = await readFile(indexPath, 'utf8');
const portableHtml = html
  .replaceAll('src="/./_next/', 'src="./_next/')
  .replaceAll('href="/./_next/', 'href="./_next/');

await writeFile(indexPath, portableHtml, 'utf8');

if (portableHtml.includes('src="/./_next/') || portableHtml.includes('href="/./_next/')) {
  throw new Error('静态资源路径转换失败');
}

console.log('Static output ready: dist/client');
