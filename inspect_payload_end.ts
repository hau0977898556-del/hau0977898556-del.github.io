import * as fs from 'fs';

const content = fs.readFileSync('deobfuscated_output.lua', 'utf-8');
const len = content.length;
console.log("File length:", len);

// Print the last 1500 characters of the file
console.log("\nLast 1500 characters of deobfuscated_output.lua:");
console.log(content.substring(len - 1500));
