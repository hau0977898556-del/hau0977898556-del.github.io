const { spawn } = require('child_process');
const fs = require('fs');
const luamin = require('luamin');
const path = require('path');

function obfuscateWithPrometheus(code, preset) {
    return new Promise((resolve, reject) => {
        const inFile = path.join(process.cwd(), 'tmp_in.lua');
        const outFile = path.join(process.cwd(), 'tmp_out.lua');
        fs.writeFileSync(inFile, code);

        const luaScript = `
        xpcall(function()
            local Prometheus = require("psu.Prometheus-0.2.9.src.prometheus.prometheus-main")
            local SOURCE_CODE = [===========[${code}]==========]
            local presetLevel = "${preset}"
            local config = Prometheus.Presets[presetLevel] or Prometheus.Presets.Medium
            
            if presetLevel == "WRD" then
                config = {
                LuaVersion = "LuaU",
                VarNamePrefix = "",
                NameGenerator = "MangledShuffled",
                PrettyPrint = false,
                Seed = 0,
                Steps = {
                    { Name = "EncryptStrings", Settings = {} },
                    { Name = "ConstantArray", Settings = { Threshold = 1, StringsOnly = true, Shuffle = true } },
                    { Name = "Vmify", Settings = {} },
                    { Name = "WrapInFunction", Settings = {} }
                }
                }
            end

            local pipeline = Prometheus.Pipeline:fromConfig(config)
            local out = pipeline:apply(SOURCE_CODE, "obfuscated.lua")
            local f = io.open("${outFile:replace(/\\/g, '/')}", "w")
            f:write(out)
            f:close()
        end, function(err)
            local f = io.open("${outFile:replace(/\\/g, '/')}.err", "w")
            f:write(tostring(err) .. "\\n" .. debug.traceback())
            f:close()
        end)
        `;

        fs.writeFileSync('run.lua', luaScript);
        
        const child = spawn('luau', ['run.lua']);
        child.on('close', () => {
            if (fs.existsSync(outFile)) {
                resolve(fs.readFileSync(outFile, 'utf8'));
            } else {
                reject(fs.readFileSync(outFile + '.err', 'utf8'));
            }
        });
    });
}

async function test() {
    try {
        let wrdVmCode = await obfuscateWithPrometheus('local a=1;a=2', 'WRD');
        let nativeLoader = `local m={}
local s=""
for _, c in ipairs({65,66,67,68,69,70}) do s = s .. string.char(c) end
local r="abc"
for i=1,6 do m[r:sub(i,i)]=s:sub(i,i) end
local p=string.gsub((...):sub(7), ".", m)
local loadedFn = (function(...)
${wrdVmCode}
end)(p)
return loadedFn()`;

        try {
            console.log("Obfuscating with ChaosOuterLayer...");
            let chaosLoader = await obfuscateWithPrometheus(nativeLoader, "ChaosOuterLayer");
            fs.writeFileSync('tmpout_chaos_test.txt', chaosLoader);
            console.log("Minifying...");
            luamin.minify(chaosLoader);
            console.log("Success");
        } catch(e) {
            console.log("LUAMIN ERROR:", e.message);
        }
    } catch(err) {
        console.log("ERR:", err);
    }
}
test();
