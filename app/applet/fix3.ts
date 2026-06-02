const fs = require('fs');
let lines = fs.readFileSync('/app/applet/server.ts', 'utf8').split('\n');

lines[269] = '                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")`;';
lines[271] = '                finalObfuscated = `return (function(...)\\n${nativeLoader}\\nend)("${garbled}")`;';
lines[272] = '            }';
lines[273] = '        }';
lines.length = 274;

// Add back the end of the file
lines.push('');
lines.push('        // Host on xhider.xyz if > 400KB');
lines.push('        if (Buffer.byteLength(finalObfuscated, \'utf8\') >= 400 * 1024) {');

fs.writeFileSync('/app/applet/server.ts', lines.join('\n'));
