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
const psuOldDir = path.resolve(process.cwd(), 'psu_old/Prometheus-master/src');

function initLuaFactory() {
  if (factoryInitPromise) return factoryInitPromise;
  
  factoryInitPromise = (async () => {
    (factory as any).luaWasm = await factory.getLuaModule();
    
    function mountDir(dir: string) {
        if (!fs.existsSync(dir)) return;
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
    mountDir(psuOldDir);
  })();
  
  return factoryInitPromise;
}

// Initialize immediately on server start
initLuaFactory().catch(console.error);

async function obfuscateWithPrometheus(code: string, presetLevel: string, isOld: boolean = false): Promise<string> {
  await initLuaFactory();
  const lua = await factory.createEngine();

  try {
    const targetDir = isOld ? psuOldDir : psuDir;
    // Set up package.path
    lua.doStringSync(`
        package.path = "${targetDir}/?.lua;${targetDir}/?/init.lua;" .. package.path
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
      elseif "${presetLevel}" == "ChaosOuterLayer" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "EncryptStrings", Settings = {} },
            { Name = "NumbersToExpressions", Settings = {} },
            { Name = "ProxifyLocals", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
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
      elseif "" == "Medium" then
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

function obfuscate(code: string, preset: string, antiFormat: boolean = false): Promise<string> {
  code = convertLuauStringInterpolation(code);

  if (preset === "psu-Compressed" || preset === "psu-ExtraMinify") {
    return new Promise(async (resolve, reject) => {
      try {
        // No timeout limit as requested
        // For ExtraMinify, we just completely strip variables using luamin, then compress directly.
        // For Compressed, we use Prometheus 'InnerCompressed' to tightly encrypt strings within the logic.
        let innerPayload = "";
        let useGarble = true;
        let useWrds = true;

        if (preset === "psu-ExtraMinify") {
            try {
                // For max FPS in game (0 FPS fix), we don't use ANY Prometheus steps internally.
                innerPayload = luamin.minify(code);
                useGarble = false; // Fast runtime, no gsub drop 
                useWrds = false;
            } catch (minErr) {
                innerPayload = code;
                useGarble = false;
                useWrds = false;
            }
        } else {
            // psu-Compressed
            innerPayload = await obfuscateWithPrometheus(code, "InnerCompressed");
            useGarble = true;
            useWrds = true;
        }
        
        // Compress using MAX level 22
        const compressedBuffer = await zstd.compress(Buffer.from(innerPayload, 'utf8'), 22);
        const base64Code = compressedBuffer.toString('base64');
        
        // Custom ASCII Map to completely destroy any trace of Base64 signatures
        // so the user gets their "garbage ASCII" look without heavy VM bloat!
        const std = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        const rnd = "dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i";
        
        let garbled = "";
        if (useGarble) {
            for (let i = 0; i < base64Code.length; i++) {
               garbled += rnd[std.indexOf(base64Code[i])];
            }
        } else {
            garbled = base64Code;
        }
        garbled = "Keera:" + garbled;
        
        let wrapperCode = "";

        if (!useWrds) {
            wrapperCode = `local _g = getfenv and getfenv() or _ENV
local e = (_g.game or game):GetService("EncodingService")
local d = e:DecompressBuffer(e:Base64Decode((...):sub(7)), (_g.Enum or Enum).CompressionAlgorithm.Zstd)
local fn, err = (_g.loadstring or loadstring)((_g.buffer or buffer).tostring(d))
if fn then return fn() else error(err) end`;
        } else {
            wrapperCode = `local _g = getfenv and getfenv() or _ENV
local _rawget = rawget or function(t, k) return t[k] end


local _game = _rawget(_g, string.char(103, 97, 109, 101)) or game
local _buffer = _rawget(_g, string.char(98, 117, 102, 102, 101, 114)) or buffer
local _loadstring = _rawget(_g, string.char(108, 111, 97, 100, 115, 116, 114, 105, 110, 103)) or loadstring

-- Bypass hookers using metamethods
local _getService = _game[string.char(71, 101, 116, 83, 101, 114, 118, 105, 99, 101)]
local _enc_s = _getService(_game, string.char(69, 110, 99, 111, 100, 105, 110, 103, 83, 101, 114, 118, 105, 99, 101))

-- Base64 payload will be passed via vararg wrapper to keep it clean and out of VM parser!
local _b64 = (...)

local _b64Buf = _buffer[string.char(102, 114, 111, 109, 115, 116, 114, 105, 110, 103)](_b64)
local _binBuf = _enc_s[string.char(66, 97, 115, 101, 54, 52, 68, 101, 99, 111, 100, 101)](_enc_s, _b64Buf)
local _e = _rawget(_g, string.char(69, 110, 117, 109)) or Enum
local _decBuf = _enc_s[string.char(68, 101, 99, 111, 109, 112, 114, 101, 115, 115, 66, 117, 102, 102, 101, 114)](_enc_s, _binBuf, _e[string.char(67, 111, 109, 112, 114, 101, 115, 115, 105, 111, 110, 65, 108, 103, 111, 114, 105, 116, 104, 109)][string.char(90, 115, 116, 100)])
local _scriptStr = _buffer[string.char(116, 111, 115, 116, 114, 105, 110, 103)](_decBuf)

-- Clear out the buffers immediately so they can't be scraped easily from memory
_b64Buf = nil
_binBuf = nil
_decBuf = nil
_payload = nil
_b64 = nil

local fn, err = _loadstring(_scriptStr)
if fn then return fn else error(err) end`;
        }

        // Wait a few MS to let JS event loop clear up
        await new Promise(r => setTimeout(r, 10));

        let finalObfuscated = "";
        const injectedWrapper = wrapperCode.replace('...', `"${garbled}"`);

        if (!useWrds) {
            try {
                // Completely skip WRD outer layer, just minify the decompression wrapper
                finalObfuscated = luamin.minify(injectedWrapper);
            } catch (err) {
                // Fallback to basic string replacement if min fails
                finalObfuscated = injectedWrapper;
            }
        } else {
            // Use WRD outer layer. WRD provides the classic Ironbrew aesthetics.
            let wrdVmCode = await obfuscateWithPrometheus(wrapperCode, "WRD");
            let nativeLoader = `local m={}
local s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
local r="dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i"
for i=1,65 do m[r:sub(i,i)]=s:sub(i,i) end
local p=string.gsub((...):sub(7), ".", m)
local loadedFn = (function(...)
${wrdVmCode}
end)(p)
return loadedFn()`;
            try {
                let chaosLoader = await obfuscateWithPrometheus(nativeLoader, "ChaosOuterLayer");
                const minNativeLoader = luamin.minify(chaosLoader);
                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")`;
            } catch (err) {
                finalObfuscated = `return (function(...)\n${nativeLoader}\nend)("${garbled}")`;
            }
        }
        const injectCustomGarbage = (code, isAntiFormat) => {
            let garbs = [
                "if false then local _={};for i=1,10 do _[i]=i end end;",
                "local function _fake() return {} end;",
                "if not script then local _=1 end;",
                "local _fake_env = getfenv and getfenv() or _ENV;",
                "(function() local _=false end)();",
                "local _v = {};"
            ];
            if (isAntiFormat) {
                garbs.push("local _ = ``;", "local _af = `antiformat`;");
            }
            let matches = [...code.matchAll(/local /g)];
            let maxInjects = Math.max(10, Math.floor(matches.length * 0.15));
            if (maxInjects > 50) maxInjects = 50;
            let toInject = [];
            for (let i = 0; i < matches.length; i++) {
                if (Math.random() < 0.4) toInject.push(i);
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
        finalObfuscated = injectCustomGarbage(finalObfuscated, antiFormat);

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
  
  if (preset.startsWith("psuOld-")) {
    const level = preset.split("-")[1];
    return obfuscateWithPrometheus(code, level, true);
  }

  if (preset.startsWith("psu-")) {
    const level = preset.split("-")[1];
    return obfuscateWithPrometheus(code, level);
  }
  
  if (preset === "psu") {
    return obfuscateWithPrometheus(code, "Medium");
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
    
    const result = await obfuscate(code, preset, antiFormat);
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

${antiFormat ? "local _af = `antiformat`" : ""}
${result}`;
    }

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
