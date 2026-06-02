const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The string we want to find to replace the injectConst block
let injectConstMatch = /        \/\/ Anti-format \(break luamin, beautifiers using simple ast parsers\)\n        const injectConst = \(code\) => \{[\s\S]+?        finalObfuscated = injectConst\(finalObfuscated\);\n/;

let replaceWith = `        // Anti-format with dummy lua code instead of const \`const\` which bot detects
        const injectCustomGarbage = (code) => {
            const garbs = [
                "if false then local _={};for i=1,10 do _[i]=i end end;",
                "local function _fake() return {} end;",
                "if not script then local _=1 end;",
                "local _fake_env = getfenv and getfenv() or _ENV;",
                "(function() local _=false end)();"
            ];
            let matches = [...code.matchAll(/local /g)];
            let maxInjects = Math.max(2, Math.floor(matches.length * 0.05));
            if (maxInjects > 20) maxInjects = 20;
            
            let toInject = [];
            for (let i = 0; i < Math.floor(matches.length * 0.8); i++) {
                if (Math.random() < 0.2) toInject.push(i);
            }
            if (toInject.length === 0 && matches.length > 0) toInject.push(0);
            if (toInject.length > maxInjects) toInject.length = maxInjects;
            
            let out = code;
            for (let i = matches.length - 1; i >= 0; i--) {
                if (toInject.includes(i)) {
                    let g = garbs[Math.floor(Math.random() * garbs.length)];
                    out = out.substring(0, matches[i].index) + g + ' local ' + out.substring(matches[i].index + 6);
                }
            }
            return out;
        };
        finalObfuscated = injectCustomGarbage(finalObfuscated);\n`;

code = code.replace(injectConstMatch, replaceWith);
fs.writeFileSync('server.ts', code);
console.log("Replaced injectConst");
