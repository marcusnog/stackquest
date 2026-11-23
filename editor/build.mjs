import {build} from 'esbuild';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.resolve(root, '../dist/vendor');
const result = await build({absWorkingDir:root, entryPoints:['editor.mjs'], outfile:path.join(vendor,'editor.js'),
  format:'esm', bundle:true, minify:true, metafile:true, legalComments:'eof'});
const packages = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const match = input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
  if (match) packages.add(match[1]);
}
const notices = [];
for (const name of [...packages].sort()) {
  const dir = path.resolve(root,name);
  const license = (await readdir(dir)).find(file => /^licen[cs]e(?:\..*)?$/i.test(file));
  if (!license) throw Error('Missing license for '+name);
  const pkg = JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
  notices.push(pkg.name+' '+pkg.version+'\n'+await readFile(path.join(dir,license),'utf8'));
}
await writeFile(path.join(vendor,'editor-licenses.txt'),notices.join('\n\n'));
