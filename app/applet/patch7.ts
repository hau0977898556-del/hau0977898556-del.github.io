import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const t = `    const result = await obfuscate(code, preset);
    const watermarkedResult = \`-- This file was protected using Prometheus Obfuscator v0.2.9 :>\\n\${result}\`;
    res.json({ code: watermarkedResult });`;

const idx = code.indexOf(`const watermarkedResult = \`-- This file was protected using Prometheus Obfuscator v0.2.9 :>\\n\${result}\`;`);

if (idx !== -1) {
    const s = code.substring(0, idx - 4) + `let finalResult = result;
    if (preset.startsWith('psu')) {
      finalResult = \`--[[\\n ____  __.                            ________ ___.     _____                           __                \\n|    |/ _|____   ________________     \\\\_____  \\\\\\\\_ |___/ ____\\\\_ __  ______ ____ _____ _/  |_  ___________ \\n|      <_/ __ \\\\_/ __ \\\\_  __ \\\\__  \\\\     /   |   \\\\| __ \\\\   __\\\\  |  \\\\/  ___// ___\\\\\\\\__  \\\\\\\\   __\\\\/  _ \\\\_  __ \\\\ \\n|    |  \\\\  ___/\\\\  ___/|  | \\\\// __ \\\\_  /    |    \\\\ \\\\_\\\\ \\\\  | |  |  /\\\\___ \\\\\\\\  \\\\___ / __ \\\\|  | (  <_> )  | \\\\/ \\n|____|__ \\\\___  >\\\\___  >__|  (____  /  \\\\_______  /___  /__| |____//____  >\\\\___  >____  /__|  \\\\____/|__|   \\n        \\\\/   \\\\/     \\\\/           \\\\/           \\\\/    \\\\/                \\\\/     \\\\/     \\\\/                   \\n          This file was protected by Keera Obfuscator v1.2 BETA\\n]]--\\n\\n\${result}\`;
    }
    res.json({ code: finalResult });`;
    const rest = code.substring(idx + 137);
    code = s + rest;
    fs.writeFileSync('server.ts', code);
    console.log("SUCCESS");
} else {
    console.log("FAIL");
}
