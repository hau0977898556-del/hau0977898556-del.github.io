import fs from 'fs';

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
let modified = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("let finalResult = result;")) {
        lines[i] = "    let finalResult = result;";
        lines[i+1] = "    if (preset.includes('psu')) {";
        lines[i+2] = "      finalResult = \`" + banner + "${result}\`;";
        lines[i+3] = "    }";
        modified = true;
        break;
    }
}

if (modified) {
    fs.writeFileSync('server.ts', lines.join('\n'));
    console.log("SUCCESS!");
} else {
    console.log("NOT FOUND!");
}
