const fs = require('fs');

function fix(filepath) {
    if (!fs.existsSync(filepath)) return;
    let s = fs.readFileSync(filepath, 'utf8');
    s = s.replace(/finalResult = `\$\{banner\}\$\{result\}`/g, 'finalResult = \\`\\$\\{banner\\}\\$\\{result\\}\\`');
    s = s.replace(/finalResult = `\$\{banner\}\$\{result\}`;/g, 'finalResult = \\`\\$\\{banner\\}\\$\\{result\\}\\`;');
    fs.writeFileSync(filepath, s);
}

fix('app/applet/watermark_update.cjs');

// For foo.ts
if (fs.existsSync('foo.ts')) {
    let s = fs.readFileSync('foo.ts', 'utf8');
    // Just find and replace to fix the last unclosed template literal maybe? Or I can just delete foo.ts, it's a test file.
    fs.unlinkSync('foo.ts');
}

