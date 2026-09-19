import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const source = dirname(require.resolve('stockfish/package.json'));
const dest = resolve(root, 'apps/web/public/chess/engine');
await mkdir(dest, { recursive: true });
for (const flavor of ['lite-single', 'single']) {
  for (const ext of ['js', 'wasm']) await copyFile(resolve(source, `bin/stockfish-19-${flavor}.${ext}`), resolve(dest, `stockfish-19-${flavor}.${ext}`));
}
await copyFile(resolve(source, 'Copying.txt'), resolve(dest, 'COPYING.txt'));
// Distribute the corresponding source alongside the unmodified GPL engine.

await writeFile(resolve(dest, 'SOURCE.txt'), 'Unmodified Stockfish.js 19.0.0, GPL-3.0. Corresponding source archive: ../stockfish-source.tar.gz\nBuild scripts and complete release: https://github.com/nmrugg/stockfish.js/tree/v19.0.0\n');
console.log('Prepared local Stockfish 19 engines and source.');
