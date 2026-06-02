const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

// Also support luau syntax
function convertLuauStringInterpolation(code) {
    return code.replace(/`([^`]*)`/g, (match, inner) => {
        if (!inner.includes('{')) {
            return '"' + inner.replace(/"/g, '\\"') + '"';
        }
        let parts = [];
        let formatStr = '';
        let inExpr = false;
        let expr = '';
        let braceLevel = 0;
        
        for (let i = 0; i < inner.length; i++) {
            let char = inner[i];
            if (char === '{') {
                if (braceLevel === 0) {
                    inExpr = true;
                    expr = '';
                    formatStr += '%s';
                } else {
                    expr += char;
                }
                braceLevel++;
            } else if (char === '}') {
                braceLevel--;
                if (braceLevel === 0) {
                    inExpr = false;
                    parts.push(`tostring(${expr})`);
                } else {
                    expr += char;
                }
            } else {
                if (inExpr) {
                    expr += char;
                } else {
                    if (char === '\n') formatStr += '\\n';
                    else if (char === '"') formatStr += '\\"';
                    else if (char === '\\') formatStr += '\\\\';
                    else formatStr += char;
                }
            }
        }
        
        if (parts.length === 0) return '"' + formatStr + '"';
        return `string.format("${formatStr}", ${parts.join(', ')})`;
    });
}

const luauRegex = /function convertLuauStringInterpolation[\s\S]*?(?=function obfuscate)/;
const luauFunctionStr = convertLuauStringInterpolation.toString() + "\n\n";

if (!text.includes('function convertLuauStringInterpolation')) {
  text = text.replace('function obfuscate(', luauFunctionStr + 'function obfuscate(');
}

let target = 'const garbs = ["if false then local _={};for i=1,10 do _[i]=i end end;", "local function _fake() return {} end;", "if not script then local _=1 end;", "local _fake_env = getfenv and getfenv() or _ENV;", "(function() local _=false end)();", "local _ = \\;", "local _af = \\;"];';
let replacement = 'const garbs = ["if false then local _={};for i=1,10 do _[i]=i end end;", "local function _fake() return {} end;", "if not script then local _=1 end;", "local _fake_env = getfenv and getfenv() or _ENV;", "(function() local _=false end)();", "local _ = ``;", "local _af = `antiformat`;"];';
if (text.includes(target)) {
  text = text.replace(target, replacement);
  fs.writeFileSync('server.ts', text);
  console.log('Successfully patched server.ts');
} else {
  console.log('Target string not found');
}
