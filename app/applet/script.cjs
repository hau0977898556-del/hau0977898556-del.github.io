const fs = require('fs');

let f = fs.readFileSync('/app/applet/server.ts', 'utf8');

f = f.replace(
    'local fn, err = _loadstring(_scriptStr)\\nif fn then return fn() else error(err) end`;',
    'local fn, err = _loadstring(_scriptStr)\\nif fn then return fn else error(err) end`;'
);

const oldWrdWrap = 'finalObfuscated = await obfuscateWithPrometheus(injectedWrapper, "WRD");';

// Use standard string concat to avoid ANY template literal issues!
const newWrdWrap = 
  'let wrdVmCode = await obfuscateWithPrometheus(wrapperCode, "WRD");\\n' +
  '            let nativeLoader = `local m={}\\n' +
  'local s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="\\n' +
  'local r="dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i"\\n' +
  'for i=1,65 do m[r:sub(i,i)]=s:sub(i,i) end\\n' +
  'local p=(...):gsub(".",m)\\n' +
  'local loadedFn = (function(...)\\n' +
  '${wrdVmCode}\\n' +
  'end)(p)\\n' +
  'return loadedFn()`;\\n' +
  '            try {\\n' +
  '                const minNativeLoader = luamin.minify(nativeLoader);\\n' +
  '                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")()`;\\n' +
  '            } catch (err) {\\n' +
  '                finalObfuscated = `return (function(...)\\n${nativeLoader}\\nend)("${garbled}")()`;\\n' +
  '            }';

f = f.replace(oldWrdWrap, newWrdWrap);

fs.writeFileSync('/app/applet/server.ts', f);
console.log("PATCH_OK:", !!f.includes('loadedFn()'));
