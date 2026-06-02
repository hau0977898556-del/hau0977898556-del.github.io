import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import zstd from '@mongodb-js/zstd';
import luamin from 'luamin';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const OBFUSCATE_TIMEOUT = 5 * 60 * 1000;

function buildSpawnArgs(preset: string, filename: string, outFileName: string) {
  if (preset === "Ib2.7.0") {
    const exePath = path.join(process.cwd(), "bin", "Debug", "netcoreapp3.1", "IronBrew2 CLI.exe");
    return { cmd: exePath, args: [filename, outFileName] };
  }
  throw new Error(`Unknown preset: ${preset}`);
}

import { LuaFactory } from 'wasmoon';

// Global factory to avoid re-reading files and re-initializing WASM on every request
const factory = new LuaFactory();
let factoryInitPromise: Promise<void> | null = null;
const psuDir = path.resolve(process.cwd(), 'psu/Prometheus-0.2.9/src');

function initLuaFactory() {
  if (factoryInitPromise) return factoryInitPromise;
  
  factoryInitPromise = (async () => {
    (factory as any).luaWasm = await factory.getLuaModule();
    
    function mountDir(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                mountDir(fullPath);
            } else if (fullPath.endsWith('.lua')) {
                factory.mountFileSync((factory as any).luaWasm, fullPath, fs.readFileSync(fullPath, 'utf8'));
            }
        }
    }
    mountDir(psuDir);
  })();
  
  return factoryInitPromise;
}

// Initialize immediately on server start
initLuaFactory().catch(console.error);

export async function obfuscateWithPrometheus(code: string, presetLevel: string): Promise<string> {
  await initLuaFactory();
  const lua = await factory.createEngine();

  try {
    // Set up package.path
    lua.doStringSync(`
        package.path = "${psuDir}/?.lua;${psuDir}/?/init.lua;" .. package.path
    `);

    // Polyfill loadstring and arg
    lua.doStringSync(`
        loadstring = load
        arg = {}
        
        -- Polyfill for math.random to handle large numbers if needed
        local old_random = math.random
        math.random = function(min, max)
            if not min then return old_random() end
            if not max then return old_random(min) end
            return old_random(min, max)
        end

        math.log10 = function(x) return math.log(x, 10) end
        
        -- Adding requested math/bit32 globals for the VM environment 
        math.abs = math.abs or function(x) return x < 0 and -x or x end
        math.sin = math.sin
        math.huge = math.huge
        
        bit32 = bit32 or {}
        bit32.bnot = bit32.bnot or function(n) return ~n end
        bit32.bxor = bit32.bxor or function(a,b) return a ~ b end
        bit32.bor = bit32.bor or function(a,b) return a | b end
        bit32.band = bit32.band or function(a,b) return a & b end
        bit32.lshift = bit32.lshift or function(a,b) return a << b end
        bit32.rshift = bit32.rshift or function(a,b) return a >> b end
        
        bit32.countlz = bit32.countlz or function(n)
            if n == 0 then return 32 end
            local count = 0
            for i = 31, 0, -1 do
                if (n & (1 << i)) == 0 then count = count + 1 else break end
            end
            return count
        end
        
        bit32.countrz = bit32.countrz or function(n)
            if n == 0 then return 32 end
            local count = 0
            for i = 0, 31 do
                if (n & (1 << i)) == 0 then count = count + 1 else break end
            end
            return count
        end
    `);

    lua.global.set('SOURCE_CODE', code);

    const luaCode = `
      local Prometheus = require("prometheus")
      local config = Prometheus.Presets["${presetLevel}"] or Prometheus.Presets.Medium
      
      -- Custom WRD configuration for very lightweight but highly secure obfuscation
      if "${presetLevel}" == "WRD" then
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
      elseif "${presetLevel}" == "InnerCompressed" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "EncryptStrings", Settings = {} },
            { Name = "ConstantArray", Settings = { Threshold = 1, StringsOnly = true, Shuffle = true } }
          }
        }
      elseif "${presetLevel}" == "InnerExtraMinifyTest2" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "ProxifyLocals", Settings = {} }
          }
        }
      elseif "${presetLevel}" == "Chaos" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "ProxifyLocals", Settings = {} },
            { Name = "Vmify", Settings = {} },
            { Name = "AntiTamper", Settings = {} },
            { Name = "EncryptStrings", Settings = {} },
            { Name = "Vmify", Settings = {} },
            { Name = "ConstantArray", Settings = { Threshold = 1, StringsOnly = false, Shuffle = true } },
            { Name = "NumbersToExpressions", Settings = {} },
            { Name = "Vmify", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
          }
        }
      elseif "${presetLevel}" == "Lite" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "WrapInFunction", Settings = {} },
            { Name = "EncryptStrings", Settings = {} },
            { Name = "ProxifyLocals", Settings = {} },
            { Name = "ConstantArray", Settings = { Threshold = 1, StringsOnly = false, Shuffle = true } }
          }
        }
      elseif "${presetLevel}" == "Medium" then
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
      else
        config.LuaVersion = "LuaU"
      end

      local pipeline = Prometheus.Pipeline:fromConfig(config)
      local out = pipeline:apply(SOURCE_CODE, "obfuscated.lua")
      return out
    `;

    const result = await lua.doString(luaCode);
    
    // We cannot call lua.global.close() because 'factory' shares the same WASM memory 
    // across all engine instances. Closing it once breaks subsequent createEngine() calls.
    // The gc will handle lua instances cleanup properly.
    
    return result;
  } catch (e) {
    throw e;
  }
}

function convertLuauStringInterpolation(code: string): string {
    return code.replace(/`([^`]*)`/g, (match, inner) => {
        if (!inner.includes('{')) {
            return '"' + inner.replace(/"/g, '\\"') + '"';
        }
        let parts: string[] = [];
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

function obfuscate(code: string, preset: string): Promise<string> {
  // Transpile Luau string interpolation to Lua 5.1 compliant code
  code = convertLuauStringInterpolation(code);

  if (preset === "psu-Compressed" || preset === "psu-ExtraMinify") {
    return new Promise(async (resolve, reject) => {
      try {
        // No timeout limit as requested
        // For ExtraMinify, we just completely strip variables using luamin, then compress directly.
        // For Compressed, we use Prometheus 'InnerCompressed' to tightly encrypt strings within the logic.
        let innerPayload = "";
        if (preset === "psu-ExtraMinify") {
            try {
                innerPayload = luamin.minify(code);
                // Also pass through Prometheus ProxifyLocals to shuffle and hide local traces
                innerPayload = await obfuscateWithPrometheus(innerPayload, "InnerExtraMinifyTest2");
                require("fs").writeFileSync(require("path").join(process.cwd(), "innerpayload2.log"), innerPayload);
            } catch (minErr) {
                console.error("LUAMIN OR PROMETHEUS INNER FAILED:", minErr);
                require("fs").writeFileSync(require("path").join(process.cwd(), "inner_failed.txt"), "Err: " + String(minErr) + "\n" + (minErr as Error).stack);
                // If luamin fails due to invalid syntax, fallback to basic InnerCompressed
                innerPayload = await obfuscateWithPrometheus(code, "InnerCompressed");
            }
        } else {
            innerPayload = await obfuscateWithPrometheus(code, "InnerCompressed");
        }
        
        // Compress using MAX level 22
        const compressedBuffer = await zstd.compress(Buffer.from(innerPayload, 'utf8'), 22);
        const base64Code = compressedBuffer.toString('base64');
        
        // Custom ASCII Map to completely destroy any trace of Base64 signatures
        // so the user gets their "garbage ASCII" look without heavy VM bloat!
        const std = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        const rnd = "dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i";
        
        let garbled = "";
        for (let i = 0; i < base64Code.length; i++) {
           garbled += rnd[std.indexOf(base64Code[i])];
        }
        garbled = "Keera:" + garbled;
        
        let wrapperCode = "";

        if (preset === "psu-ExtraMinify") {
            wrapperCode = [
"local map = {}",
"local std = \"\"",
"for _, c in ipairs({65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47,61}) do std = std .. string.char(c) end",
"local rnd = \"dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i\"",
"for i=1, 65 do map[rnd:sub(i,i)] = std:sub(i,i) end",
"local setfenv_str = string.char(115, 101, 116, 102, 101, 110, 118)",
"local _g = _G and _G[setfenv_str] and _G[setfenv_str]() or getfenv and getfenv() or _ENV",
"local _gamestr = string.char(103, 97, 109, 101)",
"local _encodingservstr = string.char(69, 110, 99, 111, 100, 105, 110, 103, 83, 101, 114, 118, 105, 99, 101)",
"local _bufferstr = string.char(98, 117, 102, 102, 101, 114)",
"local _loadstringstr = string.char(108, 111, 97, 100, 115, 116, 114, 105, 110, 103)",
"local _enumstr = string.char(69, 110, 117, 109)",
"local e = (_g[_gamestr] or game):GetService(_encodingservstr)",
"local b = (_g[_bufferstr] or buffer).fromstring((...):sub(7):gsub(\".\", map))",
"local _enumalgstr = string.char(67, 111, 109, 112, 114, 101, 115, 115, 105, 111, 110, 65, 108, 103, 111, 114, 105, 116, 104, 109)",
"local _zstdstr = string.char(90, 115, 116, 100)",
"local _e = _g[_enumstr] or Enum",
"local d = e:DecompressBuffer(e:Base64Decode(b), _e[_enumalgstr][_zstdstr])",
"local fn, err = (_g[_loadstringstr] or loadstring)((_g[_bufferstr] or buffer).tostring(d))",
"if fn then return fn() else error(err) end"
            ].join("\\n");
        } else {
            wrapperCode = [
"local _rawget = rawget or function(t, k) return t[k] end",
"local std = \"\"",
"for _, c in ipairs({65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47,61}) do std = std .. string.char(c) end",
"local rnd = \"dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i\"",
"local map = setmetatable({}, {",
"  __index = function(t, k)",
"    local f = string.find(rnd, k, 1, true)",
"    if f then return string.sub(std, f, f) end",
"    return k",
"  end",
"})",
"local setfenv_str = string.char(115, 101, 116, 102, 101, 110, 118)",
"local _g = _G and _G[setfenv_str] and _G[setfenv_str]() or getfenv and getfenv() or _ENV",
"local _gamestr = string.char(103, 97, 109, 101)",
"local _game = _rawget(_g, _gamestr) or game",
"local _buffer = _rawget(_g, string.char(98, 117, 102, 102, 101, 114)) or buffer",
"local _loadstring = _rawget(_g, string.char(108, 111, 97, 100, 115, 116, 114, 105, 110, 103)) or loadstring",
"-- Bypass hookers using metamethods",
"local service_mt = setmetatable({}, {",
"  __index = function(t, k)",
"    return _game[string.char(71, 101, 116, 83, 101, 114, 118, 105, 99, 101)](_game, k)",
"  end",
"})",
"local _enc_s = service_mt[string.char(69, 110, 99, 111, 100, 105, 110, 103, 83, 101, 114, 118, 105, 99, 101)]",
"-- Evil Math Metatable to confuse reversers",
"local _math = _rawget(_g, string.char(109, 97, 116, 104)) or math",
"local _string = _rawget(_g, string.char(115, 116, 114, 105, 110, 103)) or string",
"local _assert = assert or function(c, m) if not c then error(m) end return c end",
"local _rawset = rawset or function(t, k, v) t[k] = v end",
"local _bizarre_mt = {",
"  __add = function(a, b) return _math.ldexp(a.v, b.v) end,",
"  __sub = function(a, b) local x, y = _math.frexp(a.v); return (x or 0) + (y or 0) - b.v end,",
"  __mul = function(a, b) local x, y = _math.modf(a.v); return (x or 0) * (y or 0) * b.v end,",
"  __div = function(a, b) return _math.abs(a.v) / _math.ceil(b.v) end,",
"  __mod = function(a, b) return _math.acos(a.v) % _math.floor(b.v) end,",
"  __pow = function(a, b) return _math.sin(a.v) ^ b.v end,",
"  __concat = function(a, b) return _string.reverse(tostring(a.v) .. tostring(b.v)) end,",
"  __newindex = function(t, k, v) _assert(type(t) == \"table\", \"e\"); _rawset(t, k, v) end",
"}",
"local _chk1 = setmetatable({v=0.5}, _bizarre_mt)",
"local _chk2 = setmetatable({v=2}, _bizarre_mt)",
"_chk1.test = 1",
"_assert(_chk1.test == 1, \"f\")",
"if (_chk1 + _chk2) == nil then return end",
"if (_chk1 - _chk2) == nil then return end",
"if (_chk1 * _chk2) == nil then return end",
"if (_chk1 / _chk2) == nil then return end",
"if (_chk1 % _chk2) == nil then return end",
"if (_chk1 ^ _chk2) == nil then return end",
"if (_chk1 .. _chk2) == nil then return end",
"-- Base64 payload will be passed via vararg wrapper to keep it clean and out of VM parser!",
"local _b64 = (...):sub(7):gsub(\".\", function(k) return map[k] end)",
"local _b64Buf = _buffer[string.char(102, 114, 111, 109, 115, 116, 114, 105, 110, 103)](_b64)",
"local _binBuf = _enc_s[string.char(66, 97, 115, 101, 54, 52, 68, 101, 99, 111, 100, 101)](_enc_s, _b64Buf)",
"local _enumstr = string.char(69, 110, 117, 109)",
"local _e = _rawget(_g, _enumstr) or Enum",
"local _enumalgstr = string.char(67, 111, 109, 112, 114, 101, 115, 115, 105, 111, 110, 65, 108, 103, 111, 114, 105, 116, 104, 109)",
"local _zstdstr = string.char(90, 115, 116, 100)",
"local _decBuf = _enc_s[string.char(68, 101, 99, 111, 109, 112, 114, 101, 115, 115, 66, 117, 102, 102, 101, 114)](_enc_s, _binBuf, _e[_enumalgstr][_zstdstr])",
"local _scriptStr = _buffer[string.char(116, 111, 115, 116, 114, 105, 110, 103)](_decBuf)",
"-- Clear out the buffers immediately so they can't be scraped easily from memory",
"_b64Buf = nil",
"_binBuf = nil",
"_decBuf = nil",
"_payload = nil",
"_b64 = nil",
"local fn, err = _loadstring(_scriptStr)",
"if fn then return fn() else error(err) end"
            ].join("\n");
        }

        // Wait a few MS to let JS event loop clear up
        await new Promise(r => setTimeout(r, 10));

        let finalObfuscated = "";
        if (preset === "psu-ExtraMinify") {
            try {
                // Completely skip WRD outer layer, just minify the decompression wrapper
                const minWrapper = luamin.minify(wrapperCode);
                finalObfuscated = `return (function(...)${minWrapper}end)("${garbled}")`;
            } catch (err) {
                // Fallback to basic string replacement if min fails
                finalObfuscated = `return (function(...)\\n${wrapperCode}\\nend)("${garbled}")`;
            }
        } else {
            // Skip Prometheus completely on the outer layer to avoid looking like Prometheus!
            let outerCode = wrapperCode;
            try {
                const minOuter = luamin.minify(outerCode);
                finalObfuscated = `return (function(...)${minOuter}end)("${garbled}")`;
            } catch (err) {
                finalObfuscated = `return (function(...)\n${outerCode}\nend)("${garbled}")`;
            }
        }

        console.log("BEFORE replace:", finalObfuscated.includes("...:sub"));
        // Apply fix for luamin aggressively removing parenthesis around varargs
        finalObfuscated = finalObfuscated.replace(/\.\.\.:sub/g, "(...):sub");
        console.log("AFTER replace:", finalObfuscated.includes("...:sub"), finalObfuscated.includes("(...):sub"));

        if (preset !== "psu-ExtraMinify") {
            try {
                console.log("Sending to xhider.xyz to obfuscate further...");
                let targetSuffix = `("${garbled}")`;
                let vmLogic = finalObfuscated;
                if (finalObfuscated.endsWith(targetSuffix)) {
                    vmLogic = finalObfuscated.substring(0, finalObfuscated.length - targetSuffix.length);
                }
                
                let attempt = 0;
                let maxAttempts = 5;
                let obfText = "";
                while (attempt < maxAttempts) {
                    const xhiderRes = await fetch("https://xhider.xyz/", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            action: "create_obf",
                            api_token: "e7ec2a4cd8eaa07a3b66ca2add917ba4",
                            preset: "obf lz",
                            content: vmLogic,
                            output: "console"
                        })
                    });
                    
                    obfText = await xhiderRes.text();
                    
                    if (obfText && obfText.toLowerCase().includes("cooldown active") && obfText.includes("Please wait")) {
                        const waitMatch = obfText.match(/Please wait ([\d\.]+)s/);
                        let waitMs = 3500;
                        if (waitMatch && waitMatch[1]) {
                            waitMs = parseFloat(waitMatch[1]) * 1000 + 500; // add 500ms jitter
                        }
                        console.log(`Xhider rate limited. Waiting ${waitMs}ms...`);
                        await new Promise(r => setTimeout(r, waitMs));
                        attempt++;
                    } else {
                        break; // Success or non-ratelimit error
                    }
                }

                if (obfText && obfText.length > 0 && !obfText.toLowerCase().includes("error")) {
                   obfText = obfText.replace(/--\/\/ This file was created by XHider v1\.2 \[https:\/\/discord\.gg\/hATuHQaQRb\][\r\n]*/g, "");
                   finalObfuscated = obfText.trim() + targetSuffix; 
                } else {
                   console.error("Xhider create_obf returned invalid response after retries:", obfText);
                }
            } catch (err) {
                console.error("Xhider create_obf failed:", err);
            }
        }

        // Host on xhider.xyz if > 400KB
        if (Buffer.byteLength(finalObfuscated, 'utf8') >= 400 * 1024) {
            const randomChars = Array.from({length: 9}, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
            try {
                const uploadRes = await fetch("https://xhider.xyz/", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        action: "save",
                        api_token: "e83f55315d4ae24acfdf10027ddae10a",
                        key: "Obfuscated.psu/" + randomChars,
                        content: finalObfuscated
                    })
                });
                const resText = await uploadRes.text();
                if (resText.startsWith("Success: ")) {
                    const rawUrl = resText.replace("Success: ", "").trim();
                    finalObfuscated = `loadstring(game:HttpGet("${rawUrl}", true))()`;
                }
            } catch (err) {
                console.error("Xhider upload failed:", err);
            }
        }

        resolve(finalObfuscated);
      } catch (err) {
        reject(err);
      }
    });
  }
  
  if (preset.startsWith("psu-")) {
    const level = preset.split("-")[1];
    return obfuscateWithPrometheus(code, level);
  }
  
  if (preset === "psu") {
    return obfuscateWithPrometheus(code, "Medium");
  }

  if (preset === "InnerExtraMinifyTest2" || preset === "InnerCompressed") {
    return obfuscateWithPrometheus(code, preset);
  }

  return new Promise((resolve, reject) => {
    const inFile = tmp.fileSync({ postfix: '.lua' });
    const outFile = tmp.fileSync({ postfix: '.lua' });
    
    fs.writeFileSync(inFile.name, code, 'utf-8');

    const { cmd, args } = buildSpawnArgs(preset, inFile.name, outFile.name);
    
    const child = spawn(cmd, args);

    const timer = setTimeout(() => {
      try { child.kill(); } catch (e) {}
      reject(new Error("Timeout"));
    }, OBFUSCATE_TIMEOUT);

    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (data) => { stderr += data.toString(); });
    }
    
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      if (exitCode !== 0 && !child.killed) {
        if (stderr.includes("ENOENT") || stderr.includes("not found")) {
           reject(new Error("IronBrew2 is not supported on this environment (e.g., Render). Please use the 'psu' preset instead."));
        } else {
           reject(new Error(stderr || `Process exited with code ${exitCode}`));
        }
      } else if (exitCode === 0) {
        const result = fs.readFileSync(outFile.name, 'utf-8');
        resolve(result);
      } else {
        reject(new Error("Process killed due to timeout"));
      }
      
      try { inFile.removeCallback(); } catch(e) {}
      try { outFile.removeCallback(); } catch(e) {}
    });

    child.on("error", (err: any) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'ENOEXEC') {
        reject(new Error("IronBrew2 is not supported on this environment (e.g., Render). Please use the 'psu' preset instead."));
      } else {
        reject(err);
      }
      try { inFile.removeCallback(); } catch(e) {}
      try { outFile.removeCallback(); } catch(e) {}
    });
  });
}

app.post('/api/obfuscate', async (req, res) => {
  try {
    const { code, preset, antiFormat } = req.body;
    if (!code || !preset) {
      return res.status(400).json({ error: 'Code and preset are required' });
    }
    
    const result = await obfuscate(code, preset);
    let finalResult = result;
    if (preset.includes('psu')) {
      finalResult = `--[[
 ____  __.                            ________ ___.     _____                           __                
|    |/ _|____   ________________     \\_____  \\\\_ |___/ ____\\_ __  ______ ____ _____ _/  |_  ___________ 
|      <_/ __ \\_/ __ \\_  __ \\__  \\     /   |   \\| __ \\   __\\  |  \\/  ___// ___\\\\__  \\\\   __\\/  _ \\_  __ \\
|    |  \\  ___/\\  ___/|  | \\// __ \\_  /    |    \\ \\_\\ \\  | |  |  /\\___ \\\\  \\___ / __ \\|  | (  <_> )  | \\/
|____|__ \\___  >\\___  >__|  (____  /  \\_______  /___  /__| |____//____  >\\___  >____  /__|  \\____/|__|   
        \\/   \\/     \\/           \\/           \\/    \\/                \\/     \\/     \\/                   
          This file was protected by Keera Obfuscator v1.2 BETA
]]--

local _af = \`antiformat\`
${result}`;
    }
    
    if (antiFormat) {
      finalResult = `if not _ then local _ = \`_\` end\n${finalResult}`;
    }
    
    // Fix the luamin issue
    finalResult = finalResult.replace(/\.\.\.:sub/g, "(...):sub");

    res.json({ code: finalResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Obfuscation failed' });
  }
});

// JSON parsing error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Data payload is too large. Max size is 50MB.' });
  }
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return res.status(400).json({ error: 'Invalid JSON request.' });
  }
  next(err);
});

async function startServer() {
  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
