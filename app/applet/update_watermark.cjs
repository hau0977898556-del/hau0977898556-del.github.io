const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const banner = `--[[
 ____  __.                            ________ ___.     _____                           __                
|    |/ _|____   ________________     \\\\_____  \\\\_ |___/ ____\\_ __  ______ ____ _____ _/  |_  ___________ 
|      <_/ __ \\_/ __ \\_  __ \\__  \\     /   |   \\| __ \\   __\\  |  \\/  ___// ___\\\\__  \\\\   __\\/  _ \\_  __ \\
|    |  \\  ___/\\  ___/|  | \\// __ \\_  /    |    \\ \\_\\ \\  | |  |  /\\___ \\\\  \\___ / __ \\|  | (  <_> )  | \\/
|____|__ \\___  >\\___  >__|  (____  /  \\_______  /___  /__| |____//____  >\\___  >____  /__|  \\____/|__|   
        \\/   \\/     \\/           \\/           \\/    \\/                \\/     \\/     \\/                   
          This file was protected by Keera Obfuscator v1.2 BETA
]]--

`;

let lines = code.split('\n');
let l_idx = lines.findIndex(l => l.includes("This file was protected using Prometheus"));

if (l_idx !== -1) {
    let newCode = 
`    let finalResult = result;
    if (!preset.startsWith('psuOld-')) {
      finalResult = \`${banner}\${result}\`;
    }
    res.json({ code: finalResult });`;
    
    lines.splice(l_idx, 2, newCode);
    fs.writeFileSync('server.ts', lines.join('\n'));
    console.log("SUCCESS");
} else {
    // try finding the Keera watermark if already replaced
    let l_idx2 = lines.findIndex(l => l.includes("protected by Keera Obfuscator v1.2"));
    if (l_idx2 !== -1) {
        console.log("ALREADY APPLIED OR DIFFERENT STRUCTURE");
    } else {
        console.log("NOT FOUND");
    }
}
