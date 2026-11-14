import {readFile,writeFile,mkdir,readdir,rm,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {contentMetadata} from './lib/content.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml'};

export async function buildProject() {
  const projectRoot=await realpath(root);
  const output=path.resolve(projectRoot,'dist');
  // Only delete this checkout's generated dist directory, never a supplied path.
  if(path.dirname(output)!==projectRoot||path.basename(output)!=='dist')throw Error('Invalid build output');
  const existing=await lstat(output).catch(error=>{if(error.code!=='ENOENT')throw error});
  if(existing?.isSymbolicLink())throw Error('Build output must not be a symbolic link');

  const assets={};
  async function collect(directory,prefix='') {
    for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const name=prefix+entry.name;
      if(entry.isSymbolicLink())throw Error('Source assets must not be symbolic links: '+name);
      if(entry.isDirectory()){await collect(path.join(directory,entry.name),name+'/');continue}
      if(!entry.isFile())continue;
      if(assets['/'+name])throw Error('Duplicate public asset: '+name);
      const ext=entry.name.split('.').at(-1);
      if(!types[ext])throw Error('Unhandled asset: '+name);
      assets['/'+name]={body:await readFile(path.join(directory,entry.name),'utf8'),type:types[ext]};
    }
  }
  await collect(path.join(projectRoot,'src','client'));
  await collect(path.join(projectRoot,'public'));
  const bank=JSON.parse(await readFile(path.join(projectRoot,'data','learning-bank.json'),'utf8'));
  const examBank=JSON.parse(await readFile(path.join(projectRoot,'data','exam-bank.json'),'utf8'));
  const metadata=contentMetadata(bank);
  assets['/catalog.json']={body:await readFile(path.join(projectRoot,'data','catalog.json'),'utf8'),type:types.json};
  // Content is served by the Worker from D1, never by asset-first static routing.

  const importer=await readFile(path.join(projectRoot,'src','server','document-imports.mjs'),'utf8');
  const content=await readFile(path.join(projectRoot,'src','server','content-admin.mjs'),'utf8');
  const examService=await readFile(path.join(projectRoot,'src','server','exam-service.mjs'),'utf8');
  const server=await readFile(path.join(projectRoot,'src','server','index.mjs'),'utf8');
  const imported="import {createContentService,contentRole} from './content-admin.mjs';";
  if(!server.includes(imported))throw Error('Server entry imports changed; update the Worker build');
  const bundle=importer+'\n'+content+'\n'+examService+'\n'+server.replace(imported,'').replace("import {createDocumentImports} from './document-imports.mjs';",'').replace("import {createExamService} from './exam-service.mjs';",'')+'\nexport default createWorker('+JSON.stringify({assets,bank,...metadata,examBank})+');\n';
  const manifest=await readFile(path.join(projectRoot,'.openai','hosting.json'),'utf8');

  await rm(output,{recursive:true,force:true});
  for(const [name,asset] of Object.entries(assets)) {
    const target=path.join(output,'client',name.slice(1));
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,asset.body);
  }
  await mkdir(path.join(output,'server'),{recursive:true});
  await mkdir(path.join(output,'.openai'),{recursive:true});
  await writeFile(path.join(output,'server','index.js'),bundle);
  await writeFile(path.join(output,'.openai','hosting.json'),manifest);
  return {bankVersion:metadata.bankVersion,assets:Object.keys(assets).length,questions:Object.keys(metadata.questionVersions).length};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await buildProject()));
}
