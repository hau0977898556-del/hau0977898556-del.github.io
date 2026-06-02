const fs = require('fs');

let f = fs.readFileSync('/app/applet/server.ts', 'utf8');

f = f.replace(
    'finalObfuscated = await obfuscateWithPrometheus(wrapperCode, "WRD");',
    `let wrdVmCode = await obfuscateWithPrometheus(wrapperCode, "WRD");`
);

f = f.replace(
    'finalObfuscated = `(function(...)\\n${finalObfuscated}\\nend)("${garbled}")`;',
    `let nativeLoader = \`local m={}
local s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
local r="dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i"
for i=1,65 do m[r:sub(i,i)]=s:sub(i,i) end
local p=(...):gsub('.',m)
local loadedFn = (function(...)
\${wrdVmCode}
end)(p)
return loadedFn()\`;

            try {
                const minNativeLoader = luamin.minify(nativeLoader);
                finalObfuscated = \`return (function(...)\${minNativeLoader}end)("\${garbled}")()\`;
            } catch (err) {
                finalObfuscated = \`return (function(...)\\n\${nativeLoader}\\nend)("\${garbled}")()\`;
            }`
);

fs.writeFileSync('/app/applet/server.ts', f);
console.log("Replaced!");
