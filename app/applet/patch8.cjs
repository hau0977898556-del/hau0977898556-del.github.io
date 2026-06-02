const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const watermarkedResult = \`-- This file was protected using Prometheus Obfuscator v0.2.9 :>\\n\${result}\`;`;

const idx = code.indexOf(targetStr);

if (idx !== -1) {
    const s = `let finalResult = result;
    if (preset.startsWith('psu')) {
      finalResult = \\\`--[[\\n ____  __.                            ________ ___.     _____                           __                \\n|    |/ _|____   ________________     \\\\_____  \\\\\\\\_ |___/ ____\\\\_ __  ______ ____ _____ _/  |_  ___________ \\n|      <_/ __ \\\\_/ __ \\\\_  __ \\\\__  \\\\     /   |   \\\\| __ \\\\   __\\\\  |  \\\\/  ___// ___\\\\\\\\__  \\\\\\\\   __\\\\/  _ \\\\_  __ \\\\ \\n|    |  \\\\  ___/\\\\  ___/|  | \\\\// __ \\\\_  /    |    \\\\ \\\\_\\\\ \\\\  | |  |  /\\\\___ \\\\\\\\  \\\\___ / __ \\\\|  | (  <_> )  | \\\\/ \\n|____|__ \\\\___  >\\\\___  >__|  (____  /  \\\\_______  /___  /__| |____//____  >\\\\___  >____  /__|  \\\\____/|__|   \\n        \\\\/   \\\\/     \\\\/           \\\\/           \\\\/    \\\\/                \\\\/     \\\\/     \\\\/                   \\n          This file was protected by Keera Obfuscator v1.2 BETA\\n]]--\\n\\n\${result}\\\`;
    }
    res.json({ code: finalResult });`;
    // Clean escape chars
    const cleaned = s.replace(/\\\\\\`/g, '`').replace(/\\\\n/g, '\\n').replace(/\\\\\\\\/g, '\\\\').replace(/\\\\_/g, '\\_').replace(/\\\\\\//g, '\\/');
    
    // Replace the exact chunk
    // 359: const watermarkedResult = ...
    // 360: res.json({ code: watermarkedResult });
    let lines = code.split('\n');
    let l_idx = -1;
    for(let i=0; i<lines.length; i++){
       if(lines[i].includes('Prometheus Obfuscator v0.2.9 :>')) {
           l_idx = i; break;
       }
    }
    if (l_idx !== -1) {
       lines.splice(l_idx, 2, `    let finalResult = result;
    if (preset.startsWith('psu')) {
      finalResult = \`--[[
 ____  __.                            ________ ___.     _____                           __                
|    |/ _|____   ________________     \\\\_____  \\\\\\\\_ |___/ ____\\\\_ __  ______ ____ _____ _/  |_  ___________ 
|      <_/ __ \\\\_/ __ \\\\_  __ \\\\__  \\\\     /   |   \\\\| __ \\\\   __\\\\  |  \\\\/  ___// ___\\\\\\\\__  \\\\\\\\   __\\\\/  _ \\\\_  __ \\\\
|    |  \\\\  ___/\\\\  ___/|  | \\\\// __ \\\\_  /    |    \\\\ \\\\_\\\\ \\\\  | |  |  /\\\\___ \\\\\\\\  \\\\___ / __ \\\\|  | (  <_> )  | \\\\/
|____|__ \\\\___  >\\\\___  >__|  (____  /  \\\\_______  /___  /__| |____//____  >\\\\___  >____  /__|  \\\\____/|__|   
        \\\\/   \\\\/     \\\\/           \\\\/           \\\\/    \\\\/                \\\\/     \\\\/     \\\\/                   
          This file was protected by Keera Obfuscator v1.2 BETA
]]--

\${result}\`;
    }
    res.json({ code: finalResult });`);
       fs.writeFileSync('server.ts', lines.join('\n'));
       console.log('SUCCESS');
    }
} else {
    console.log("FAIL");
}
