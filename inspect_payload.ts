import * as fs from 'fs';

const content = fs.readFileSync('deobfuscated_output.lua', 'utf-8');

// Find all indices of WmA and uWk
function getIndices(pattern: string) {
  const result: number[] = [];
  let index = content.indexOf(pattern);
  while (index !== -1) {
    result.push(index);
    index = content.indexOf(pattern, index + 1);
  }
  return result;
}

console.log("WmA indices:", getIndices("WmA"));
console.log("uWk indices:", getIndices("uWk"));

// Also search for references to double bracket strings if any, or large string literals
// Let's print the first 2000 chars of the second line of content
console.log("\nFirst 2000 characters of line 2:");
console.log(content.substring(content.indexOf('\n') + 1, content.indexOf('\n') + 2001));
