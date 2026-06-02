const fs = require('fs');
let lines = fs.readFileSync('/app/applet/server.ts', 'utf8').split('\n');

lines[269] = '                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")`;';
lines[271] = '                finalObfuscated = `return (function(...)\\n${nativeLoader}\\nend)("${garbled}")`;';
lines.splice(272, 2);

fs.writeFileSync('/app/applet/server.ts', lines.join('\n'));
