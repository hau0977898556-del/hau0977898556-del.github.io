import fs from 'fs';

function fixFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  // the \` issue
  content = content.replace(/\\\`/g, '`');
  // the \${ issue (except where we actually want it... hmm wait, if I replace \\\${ with \${)
  content = content.replace(/\\\$/g, '$');
  // the \\n issue
  // Wait, if it's literally \\n I might want \n
  
  // Actually, I'll just do manual replaces for server.ts
  fs.writeFileSync(file, content);
}

fixFile('app/applet/server.ts');
fixFile('app/applet/do_watermark.ts');
fixFile('app/applet/watermark_update.cjs');
fixFile('foo.ts');
