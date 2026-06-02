import fs from 'fs';

let f = fs.readFileSync('/app/applet/server.ts', 'utf8');
const s = f.split('\n');
s[269] = '                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")`;';
s[271] = '                finalObfuscated = `return (function(...)';
s[272] = '${nativeLoader}';
s[273] = 'end)("${garbled}")`;';
fs.writeFileSync('/app/applet/server.ts', s.join('\n'));
