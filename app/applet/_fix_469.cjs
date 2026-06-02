const fs = require('fs');
let s = fs.readFileSync('app/applet/server.ts', 'utf8');
s = s.replace('local _af = `antiformat`', 'local _af = \\`antiformat\\`');
s = s.replace('`if not _ then local _ = `_` end\\n${finalResult}`', '`if not _ then local _ = \\`_\\` end\\n${finalResult}`');
fs.writeFileSync('app/applet/server.ts', s);
