const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.ts', 'utf8');

code = code.replace(
  'local b = (_g.buffer or buffer).fromstring((...):gsub(".", map))',
  'local b = (_g.buffer or buffer).fromstring((...):sub(7):gsub(".", map))'
);

fs.writeFileSync('/app/applet/server.ts', code);
console.log("Patched");
