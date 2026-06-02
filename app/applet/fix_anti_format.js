const fs = require('fs');
let lines = fs.readFileSync('/app/applet/server.ts', 'utf8').split('\n');

lines.splice(274, 0, '        // Anti-format (break luamin, beautifiers using simple ast parsers)');
lines.splice(275, 0, '        finalObfuscated = "const _=1;\\n" + finalObfuscated;');

fs.writeFileSync('/app/applet/server.ts', lines.join('\n'));
