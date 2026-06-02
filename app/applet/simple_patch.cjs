const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// We will construct the banner string piece by piece.
const b1 = "--[[\\n";
const b2 = " ____  __.                            ________ ___.     _____                           __                \\n";
const b3 = "|    |/ _|____   ________________     \\\\_____  \\\\_ |___/ ____\\_ __  ______ ____ _____ _/  |_  ___________ \\n";
const b4 = "|      <_/ __ \\_/ __ \\_  __ \\__  \\     /   |   \\| __ \\   __\\  |  \\/  ___// ___\\\\__  \\\\   __\\/  _ \\_  __ \\\\n";
const b5 = "|    |  \\  ___/\\  ___/|  | \\// __ \\_  /    |    \\ \\_\\ \\  | |  |  /\\___ \\\\  \\___ / __ \\|  | (  <_> )  | \\/\\n";
const b6 = "|____|__ \\___  >\\___  >__|  (____  /  \\_______  /___  /__| |____//____  >\\___  >____  /__|  \\____/|__|   \\n";
const b7 = "        \\/   \\/     \\/           \\/           \\/    \\/                \\/     \\/     \\/                   \\n";
const b8 = "          This file was protected by Keera Obfuscator v1.2 BETA\\n";
const b9 = "]]--\\n\\n";

const banner = b1 + b2 + b3 + b4 + b5 + b6 + b7 + b8 + b9;
const lineToFind = "let finalResult = result;";

let lines = code.split('\\n');
let modified = false;
for(let i = 0; i < lines.length; i++) {
    if(lines[i].includes(lineToFind)) {
        lines[i] = "    let finalResult = result;";
        lines[i+1] = "    if (preset.includes('psu')) {";
        lines[i+2] = "      finalResult = banner + result;";
        lines[i+3] = "    }";
        modified = true;
        break;
    }
}

if(modified) {
    code = lines.join('\\n');
    let bDecl = "const banner = " + JSON.stringify(banner) + ";\\n";
    code = bDecl + code;
    fs.writeFileSync('server.ts', code);
    console.log("Success");
} else {
    console.log("Not found");
}
