// Copy only the reviewed visitor site. Never publish the engineering docs tree.
import {copyFile,mkdir,lstat} from 'node:fs/promises';
import {resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
if(args.length!==2 || args[0]!=='--output' || !isAbsolute(args[1])) throw Error('Use --output /absolute/new-public-site-directory');
const output=resolve(args[1]);
const guides=['installation','manual','privacy','limitations','release-notes'];
const files=['index.html','site.css','site.js','assets/app-icon.svg','assets/today.png','assets/tasks.png','assets/habits.png',...guides.flatMap(name=>[`guide/${name}.html`,`guide/${name}.zh.md`,`guide/${name}.en.md`])];
for(const file of files) if(!(await lstat(resolve(root,'docs',file))).isFile()) throw Error(`Expected regular reviewed site file: ${file}`);
// No cleanup or replacement: an existing destination fails before any copy.
await mkdir(output);
for(const file of files){
  await mkdir(dirname(resolve(output,file)),{recursive:true});
  await copyFile(resolve(root,'docs',file),resolve(output,file));
}
console.log(`Staged ${files.length} explicitly allowed public site files; no engineering/evidence/agent docs.`);
