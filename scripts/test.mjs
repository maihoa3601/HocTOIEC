import {readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const files=(await readdir(new URL('tests/',root))).filter(name=>name.endsWith('.test.mjs')).sort();
if(!files.length)throw Error('No tests found');
const child=spawn(process.execPath,['--test',...files.map(name=>fileURLToPath(new URL('tests/'+name,root)))],{cwd:fileURLToPath(root),stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??1});
