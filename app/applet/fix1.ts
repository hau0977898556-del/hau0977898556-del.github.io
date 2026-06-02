const fs = require('fs');
let f = fs.readFileSync('/app/applet/server.ts', 'utf8');
const s = f.split('\n');
s[269] = '                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")`;';
s[271] = '                finalObfuscated = `return (function(...)`;';
s[272] = 'finalObfuscated += \'\\n\' + nativeLoader + \'\\n\';';
s[273] = 'finalObfuscated += `end)("${garbled}")`;';
fs.writeFileSync('/app/applet/server.ts', s.join('\n'));
