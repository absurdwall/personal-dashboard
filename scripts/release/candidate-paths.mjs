import {mkdirSync,existsSync,statSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname,join,sep} from 'node:path';

const inside=(parent,path)=>{const rel=relative(parent,path);return rel==='' || (!rel.startsWith(`..${sep}`)&&rel!=='..'&&!isAbsolute(rel));};
const noindex=path=>path.split(sep).some(part=>part.endsWith('.noindex'));

// Public packaging preparation: no compiler or bundler is invoked here.
export function prepareCandidateDirectories({sourceDirectory,outputDirectory,cacheDirectory}){
  const source=realpathSync(sourceDirectory);
  for(const [label,path] of [['Candidate output',outputDirectory],['Build cache',cacheDirectory]]){
    if(!path || !isAbsolute(path) || !noindex(path) || inside(source,resolve(path))) throw Error(`${label} must be an absolute external .noindex directory`);
  }
  if(existsSync(outputDirectory)) throw Error('Candidate output already exists; never overwrite a redistributable build');
  if(existsSync(cacheDirectory)&&!statSync(cacheDirectory).isDirectory()) throw Error('Build cache must be a directory; candidate output was not created');
  mkdirSync(cacheDirectory,{recursive:true});
  const canonicalCache=realpathSync(cacheDirectory);
  if(!noindex(canonicalCache)||inside(source,canonicalCache)) throw Error('Resolved build cache must remain an external .noindex directory');
  mkdirSync(dirname(outputDirectory),{recursive:true});
  const canonicalParent=realpathSync(dirname(outputDirectory));
  if(!noindex(canonicalParent)||inside(source,canonicalParent)) throw Error('Resolved candidate output must remain an external .noindex directory');
  mkdirSync(outputDirectory); // no recursive: a concurrent existing candidate remains protected
  const stagingDirectory=join(outputDirectory,'staging');mkdirSync(stagingDirectory);
  return {cacheDirectory:canonicalCache,outputDirectory,stagingDirectory};
}
