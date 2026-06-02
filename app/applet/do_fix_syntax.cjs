const fs = require('fs');
const path = require('path');

function fixFile(file) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/\\\`/g, '`');
  content = content.replace(/\\\$\{/g, '${');
  fs.writeFileSync(fullPath, content);
  console.log('Fixed', file);
}

fixFile('app/applet/server.ts');
fixFile('app/applet/do_watermark.ts');
fixFile('app/applet/watermark_update.cjs');
fixFile('foo.ts');
