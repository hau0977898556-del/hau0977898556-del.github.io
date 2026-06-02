const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newWatermark = `let finalResult = result;
    if (preset.startsWith('psu')) {
      finalResult = \\\`--[[
 ____  __.                            ________ ___.     _____                           __                
|    |/ _|____   ________________     \\\\_____  \\\\_ |___/ ____\\_ __  ______ ____ _____ _/  |_  ___________ 
|      <_/ __ \\_/ __ \\_  __ \\__  \\     /   |   \\| __ \\   __\\  |  \\/  ___// ___\\\\__  \\\\   __\\/  _ \\_  __ \\
|    |  \\  ___/\\  ___/|  | \\// __ \\_  /    |    \\ \\_\\ \\  | |  |  /\\___ \\\\  \\___ / __ \\|  | (  <_> )  | \\/
|____|__ \\___  >\\___  >__|  (____  /  \\_______  /___  /__| |____//____  >\\___  >____  /__|  \\____/|__|   
        \\/   \\/     \\/           \\/           \\/    \\/                \\/     \\/     \\/                   
          This file was protected by Keera Obfuscator v1.2 BETA
]]--

\${result}\\\`;
    }
    res.json({ code: finalResult });`;

code = code.replace(/const watermarkedResult = `.+?`;\n\s*res\.json\(\{ code: watermarkedResult \}\);/, newWatermark);

fs.writeFileSync('server.ts', code);
console.log('Done replacement');
