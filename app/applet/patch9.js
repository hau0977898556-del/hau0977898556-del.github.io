const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");
let lines = code.split("\n");
let l_idx = lines.findIndex(l => l.includes("Prometheus Obfuscator v0.2.9 :>"));
if (l_idx !== -1) {
    lines.splice(l_idx, 2,
    "    let finalResult = result;",
    "    if (!preset.startsWith('psuOld-')) {",
    "      finalResult = `--[[",
    " ____  __.                            ________ ___.     _____                           __                ",
    "|    |/ _|____   ________________     \\\\_____  \\\\_ |___/ ____\\_ __  ______ ____ _____ _/  |_  ___________ ",
    "|      <_/ __ \\_/ __ \\_  __ \\__  \\     /   |   \\| __ \\   __\\  |  \\/  ___// ___\\\\__  \\\\   __\\/  _ \\_  __ \\",
    "|    |  \\  ___/\\  ___/|  | \\// __ \\_  /    |    \\ \\_\\ \\  | |  |  /\\___ \\\\  \\___ / __ \\|  | (  <_> )  | \\/",
    "|____|__ \\___  >\\___  >__|  (____  /  \\_______  /___  /__| |____//____  >\\___  >____  /__|  \\____/|__|   ",
    "        \\/   \\/     \\/           \\/           \\/    \\/                \\/     \\/     \\/                   ",
    "          This file was protected by Keera Obfuscator v1.2 BETA",
    "]]--\\n\\n" + "${result}`;",
    "    }",
    "    res.json({ code: finalResult });");
    fs.writeFileSync("server.ts", lines.join("\n"));
    console.log("SUCCESS");
} else {
    console.log("NOT FOUND");
}
