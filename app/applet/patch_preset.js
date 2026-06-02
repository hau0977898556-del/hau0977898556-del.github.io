const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Rewrite the preset config for Medium
let oldPresetBlock = `      elseif "\\${presetLevel}" == "InnerCompressed" then`;
let newPresetBlock = `      elseif "\\${presetLevel}" == "Medium" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "WrapInFunction", Settings = {} },
            { Name = "NumbersToExpressions", Settings = {} },
            { Name = "EncryptStrings", Settings = {} },
            { Name = "ProxifyLocals", Settings = {} },
            { Name = "Vmify", Settings = {} },
            { Name = "ConstantArray", Settings = { Threshold = 1, StringsOnly = false, Shuffle = true } },
            { Name = "Vmify", Settings = {} }
          }
        }
      elseif "\\${presetLevel}" == "InnerCompressed" then`;

code = code.replace(oldPresetBlock, newPresetBlock);

// 2. Change injectConst function
let oldInjectConstStart = `const injectConst = (code) => {`;
let oldInjectConstEnd = `finalObfuscated = injectConst(finalObfuscated);`;

let startIndex = code.indexOf(oldInjectConstStart);
let endIndex = code.indexOf(oldInjectConstEnd) + oldInjectConstEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    let newInjectConst = `const injectCustomGarbage = (code) => {
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
        finalObfuscated = injectCustomGarbage(finalObfuscated);`;
    code = code.substring(0, startIndex) + newInjectConst + code.substring(endIndex);
}

fs.writeFileSync('server.ts', code);
console.log('PATCHED');
