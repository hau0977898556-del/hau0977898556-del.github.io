const fs = require('fs');

let cjs = fs.readFileSync('app/applet/watermark_update.cjs', 'utf8');

cjs = cjs.split('\\n').map((line, i) => {
    if (line.includes('finalResult = `') && line.includes('${banner}')) {
        return line.replace(/`\$\{banner\}\$\{result\}`/, '\\`\\$\\{banner\\}\\$\\{result\\}\\`');
    }
    return line;
}).join('\\n');

fs.writeFileSync('app/applet/watermark_update.cjs', cjs);
