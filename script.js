const fs = require('fs');
let f = fs.readFileSync('/app/applet/server.ts', 'utf8');

f = f.replace(
    'local fn, err = _loadstring(_scriptStr)\nif fn then return fn() else error(err) end`;',
    'local fn, err = _loadstring(_scriptStr)\nif fn then return fn else error(err) end`;'
);

const oldWrdWrap = 'finalObfuscated = await obfuscateWithPrometheus(injectedWrapper, "WRD");';

const newWrdWrap = `let wrdVmCode = await obfuscateWithPrometheus(wrapperCode, "WRD");
            let nativeLoader = \\\`local m={}\nlocal s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="\nlocal r="dIHBWMeYjX((~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i"\nfor i=1,65 do m[r:sub(i,i)]=s:sub(i,i) end\nlocal p=(...): gsub(".",m)\nlocal loadedFn = (function(...)\n${wrdVmCode}\nend)(p)\nreturn loadedFn()\\\`;
            try {
                const minNativeLoader = luamin.minify(nativeLoader);
                finalObfuscated = \\\`return (function(...)${minNativeLoader}end)("${garbled}")()\\\`;
            } catch (err) {
                finalObfuscated = \\\`return (function(...)\\n${nativeLoader}\\nend)("${garbled}")()\\\`;
            }`;

f = f.replace(oldWrdWrap, newWrdWrap);

fs.writeFileSync('/app/applet/server.ts', f);
console.log("PATCH_OK:", f.includes('minNativeLoader'));