import fs from 'fs';

let code = fs.readFileSync('/app/applet/server.ts', 'utf8');

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

let lines = code.split('\\n');
let modified = false;
for (let i = 0; i < lines.length; i++) {
    // We look for finalResult = ; which is the syntax error.
    if (lines[i].includes("finalResult = ;")) {
        lines[i] = "      finalResult = \`" + banner + "${result}\`;";
        modified = true;
    }
    // Also fix the if statement if it's there
    if (lines[i].includes("if (preset.startsWith('psu-Compressed')) {")) {
        lines[i] = "    if (preset.includes('psu')) {";
        modified = true;
    }
}

if (modified) {
    fs.writeFileSync('/app/applet/server.ts', lines.join('\\n'));
    console.log("SYNTAX ERROR FIXED!");
} else {
    console.log("SYNTAX ERROR NOT FOUND!");
}
