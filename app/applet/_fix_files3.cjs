const fs = require('fs');

let cjs = fs.readFileSync('app/applet/watermark_update.cjs', 'utf8');

cjs = cjs.replace(/finalResult = \\\\\`\$\{banner\}\$\{result\}\\\\\`/g, 'finalResult = \\`\\$\\{banner\\}\\$\\{result\\}\\`');

fs.writeFileSync('app/applet/watermark_update.cjs', cjs);
