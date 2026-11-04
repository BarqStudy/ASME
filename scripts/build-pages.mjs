import {spawnSync} from 'node:child_process';import {cp,readFile,readdir,rm,writeFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.execPath,[path.join(root,'platform/scripts/build-pages.mjs')],{cwd:root,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1);
const source=path.join(root,'platform/.pages-build/out');
// dist is an ignored deployment artifact. Existing root hashed assets are retained
// for cached pages; application source directories are never copied over.
await rm(path.join(root,'dist'),{recursive:true,force:true});await cp(source,path.join(root,'dist'),{recursive:true});
const forbidden=new Set(['app','platform','backend','scripts','tests','.git','node_modules','package.json','package-lock.json']);
for(const name of await readdir(source)){if(forbidden.has(name))throw new Error('Export overlaps application source');await cp(path.join(source,name),path.join(root,name),{recursive:true});}
await writeFile(path.join(root,'.nojekyll'),'');
const html=await readFile(path.join(root,'dist/index.html'),'utf8');if(!html.includes('/ASME/_next/'))throw new Error('Missing project base path');
console.log('Published artifacts prepared in dist/ and repository root for both Pages deployment modes.');
