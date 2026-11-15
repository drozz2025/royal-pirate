import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';

const src=new URL('../src/',import.meta.url);
const componentFiles=readdirSync(src)
  .filter(name=>/\\.(?:ts|tsx)$/.test(name)&&name!=='main.tsx');

test('SSR-tested components do not import CSS through Node unsupported extensions',()=>{
  // Vite understands CSS imports, but `node --import tsx --test` does not.
  // The app entrypoint may import styles; reusable components must remain test-importable.
  const invalid:string[]=[];
  for(const file of componentFiles){
    const content=readFileSync(new URL(file,src),'utf8');
    for(const [index,line] of content.split(/\\r?\\n/).entries()){
      if(/^\\s*import\\b/.test(line)&&/\\.css['"]/.test(line)){
        invalid.push(file+':'+(index+1)+': '+line.trim());
      }
    }
  }
  assert.deepEqual(invalid,[],[
    'Move CSS imports from reusable components into the browser entrypoint,',
    'or supply an explicit CSS loader for Node tests. Offending imports:',
    ...invalid
  ].join('\\n'));
});

test('the browser entrypoint still includes required core stylesheet assets',()=>{
  const main=readFileSync(new URL('main.tsx',src),'utf8');
  for(const asset of ['harbour.css','style.css','app-screens.css']){
    assert.ok(main.includes("'./"+asset+"'"),asset+' must remain available in Vite');
  }
});
