import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import zstd from '@mongodb-js/zstd';
import luamin from 'luamin';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const OBFUSCATE_TIMEOUT = 5 * 60 * 1000;

function buildSpawnArgs(preset: string, filename: string, outFileName: string) {
  if (preset === "Ib2.7.0") {
    if (process.platform === "win32") {
      const exePath = path.join(process.cwd(), "bin", "Debug", "netcoreapp3.1", "IronBrew2 CLI.exe");
      return { cmd: exePath, args: [filename, outFileName] };
    } else {
      const dllPath = path.join(process.cwd(), "bin", "Debug", "netcoreapp3.1", "IronBrew2 CLI.dll");
      return { cmd: "dotnet", args: [dllPath, filename, outFileName] };
    }
  }
  throw new Error(`Unknown preset: ${preset}`);
}

import { LuaFactory } from 'wasmoon';

// Global factory to avoid re-reading files and re-initializing WASM on every request
let factory = new LuaFactory();
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

async function recycleLuaFactory() {
  console.log("[Memory Manager] Garbage collector triggered to release host memory...");
  if (global.gc) {
    try {
      global.gc();
      console.log(`[Memory Manager] Garbage collector triggered successfully. Host RSS is now at ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB`);
    } catch (e) {
      console.warn("[Memory Manager] GC trigger error:", e);
    }
  }
}

// Initialize immediately on server start
initLuaFactory().catch(console.error);

async function obfuscateWithPrometheus(code: string, presetLevel: string, isOld: boolean = false): Promise<string> {
  await initLuaFactory();
  const currentMemoryRssMb = process.memoryUsage().rss / 1024 / 1024;
  if (currentMemoryRssMb > 300) {
    console.warn(`[Memory Warning] High memory detected inside Prometheus: ${currentMemoryRssMb.toFixed(1)}MB. Purging garbage memory...`);
    await recycleLuaFactory();
  }
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
      local config = nil
      
      -- Custom configurations that perfectly match user constraints to get tiny outputs (under 100KB instead of 2.5MB), keeping maximum FPS
      if "${presetLevel}" == "WRD" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "EncryptStrings", Settings = {} },
            { Name = "AntiTamper", Settings = { UseDebug = false } },
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
            { Name = "AddVararg", Settings = {} },
            { Name = "EncryptStrings", Settings = {} },
            { Name = "AntiTamper", Settings = { UseDebug = false } },
            { Name = "Vmify", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
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
            { Name = "ConstantArray", Settings = { Threshold = 1, StringsOnly = true, Shuffle = true } },
            { Name = "ProxifyLocals", Settings = {} },
            { Name = "NumbersToExpressions", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
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
            { Name = "AddVararg", Settings = {} },
            { Name = "EncryptStrings", Settings = {} },
            { Name = "AntiTamper", Settings = { UseDebug = false } },
            { Name = "Vmify", Settings = {} },
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
      elseif "${presetLevel}" == "Strong" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "EncryptStrings", Settings = {} },
            { Name = "AntiTamper", Settings = { UseDebug = false } },
            { Name = "Vmify", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
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
            { Name = "EncryptStrings", Settings = {} },
            { Name = "AntiTamper", Settings = { UseDebug = false } },
            { Name = "Vmify", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
          }
        }
      elseif "${presetLevel}" == "Weak" then
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "EncryptStrings", Settings = {} },
            { Name = "Vmify", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
          }
        }
      else
        config = {
          LuaVersion = "LuaU",
          VarNamePrefix = "",
          NameGenerator = "MangledShuffled",
          PrettyPrint = false,
          Seed = 0,
          Steps = {
            { Name = "EncryptStrings", Settings = {} },
            { Name = "AntiTamper", Settings = { UseDebug = false } },
            { Name = "Vmify", Settings = {} },
            { Name = "WrapInFunction", Settings = {} }
          }
        }
      end

      -- Explicitly clean and remove code-inflation steps when virtualizing (Vmify) is active to prevent heavy build sizes
      local function cloneAndCleanConfig(orig)
        local copy = {}
        if not orig then return copy end
        for k, v in pairs(orig) do
          if k == "Steps" and v then
            local stepsCopy = {}
            for _, step in ipairs(v) do
              local includeStep = true
              -- If Vmify is active, completely strip out high-inflation steps to prevent 2.5MB output logs
              if step.Name == "NumbersToExpressions" or step.Name == "ConstantArray" or step.Name == "ProxifyLocals" or step.Name == "SplitStrings" then
                local hasVm = false
                for _, s in ipairs(v) do
                  if s.Name == "Vmify" then
                    hasVm = true
                  end
                end
                if hasVm then
                  includeStep = false
                end
              end
              if includeStep then
                table.insert(stepsCopy, step)
              end
            end
            copy.Steps = stepsCopy
          else
            copy[k] = v
          end
        end
        return copy
      end

      config = cloneAndCleanConfig(config)

      local pipeline = Prometheus.Pipeline:fromConfig(config)
      local out = pipeline:apply(SOURCE_CODE, "obfuscated.lua")
      return out
    `;

    const result = await lua.doString(luaCode);
    return result;
  } catch (e) {
    throw e;
  } finally {
    try {
      lua.global.close();
    } catch (e) {
      console.warn("Error closing lua engine instance:", e);
    }
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

function safeLuauMinify(code: string): string {
    let result = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
        const char = code[i];

        // 1. Double-quoted string
        if (char === '"') {
            result += '"';
            i++;
            while (i < len) {
                const c = code[i];
                if (c === '\\') {
                    result += '\\' + (code[i + 1] || '');
                    i += 2;
                } else if (c === '"') {
                    result += '"';
                    i++;
                    break;
                } else {
                    result += c;
                    i++;
                }
            }
            continue;
        }

        // 2. Single-quoted string
        if (char === "'") {
            result += "'";
            i++;
            while (i < len) {
                const c = code[i];
                if (c === '\\') {
                    result += '\\' + (code[i + 1] || '');
                    i += 2;
                } else if (c === "'") {
                    result += "'";
                    i++;
                    break;
                } else {
                    result += c;
                    i++;
                }
            }
            continue;
        }

        // 3. Multi-line string or comment
        if (char === '[' && i + 1 < len && (code[i + 1] === '[' || code[i + 1] === '=')) {
            let eqCount = 0;
            let j = i + 1;
            while (j < len && code[j] === '=') {
                eqCount++;
                j++;
            }
            if (j < len && code[j] === '[') {
                const startIdx = i;
                const endBracket = ']' + '='.repeat(eqCount) + ']';
                const endIdx = code.indexOf(endBracket, j + 1);
                if (endIdx !== -1) {
                    result += code.slice(startIdx, endIdx + endBracket.length);
                    i = endIdx + endBracket.length;
                    continue;
                }
            }
        }

        // 4. Comment (single-line or multi-line)
        if (char === '-' && i + 1 < len && code[i + 1] === '-') {
            i += 2;
            if (i < len && code[i] === '[') {
                let eqCount = 0;
                let j = i + 1;
                while (j < len && code[j] === '=') {
                    eqCount++;
                    j++;
                }
                if (j < len && code[j] === '[') {
                    const endBracket = ']' + '='.repeat(eqCount) + ']';
                    const endIdx = code.indexOf(endBracket, j + 1);
                    if (endIdx !== -1) {
                        i = endIdx + endBracket.length;
                        result += ' ';
                        continue;
                    }
                }
            }
            while (i < len && code[i] !== '\n' && code[i] !== '\r') {
                i++;
            }
            result += ' ';
            continue;
        }

        // 5. Standard character
        result += char;
        i++;
    }

    return result
        .replace(/[ \t]+/g, ' ')
        .replace(/\r/g, '')
        .replace(/\n\s*\n/g, '\n')
        .replace(/^[ \t]+/gm, '')
        .replace(/[ \t]+$/gm, '')
        .trim();
}

function obfuscate(code: string, preset: string, antiFormat: boolean = false): Promise<string> {
  code = convertLuauStringInterpolation(code);

  if (preset === "psu-Minify") {
    try {
      return Promise.resolve(luamin.minify(code));
    } catch (err) {
      return Promise.resolve(safeLuauMinify(code));
    }
  }

  // Before obfuscation, minify the code first to improve execution performance and shrink subsequent AST/VM size
  try {
    const minified = luamin.minify(code);
    if (minified && minified.trim().length > 0) {
      code = minified;
    }
  } catch (minifyErr) {
    console.warn("Pre-obfuscation minify with luamin skipped due to syntax/unsupported structure, falling back to safeLuauMinify");
    try {
      code = safeLuauMinify(code);
    } catch (fallbackErr) {
      console.error("Safe fallback minification failed:", fallbackErr);
    }
  }

  if (preset === "MinRay V2" || preset === "psu-Compressed" || preset === "psu-ExtraMinify") {
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
                useGarble = true; 
                useWrds = false;
            } catch (minErr) {
                innerPayload = safeLuauMinify(code);
                useGarble = true;
                useWrds = false;
            }
        } else {
            // MinRay V2 / psu-Compressed
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
        garbled = "MinRay:" + garbled;
        
        let wrapperCode = "";

         if (!useWrds) {
             wrapperCode = "local map = {}\n" +
"local std = ''\n" +
"for _, c in ipairs({65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47,61}) do std = std .. string.char(c) end\n" +
"local rnd = 'dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i'\n" +
"for i=1, 65 do map[rnd:sub(i,i)] = std:sub(i,i) end\n" +
"local setfenv_str = string.char(115, 101, 116, 102, 101, 110, 118)\n" +
"local _g = _G and _G[setfenv_str] and _G[setfenv_str]() or getfenv and getfenv() or _ENV\n" +
"local _gamestr = string.char(103, 97, 109, 101)\n" +
"local _encodingservstr = string.char(69, 110, 99, 111, 100, 105, 110, 103, 83, 101, 114, 118, 105, 99, 101)\n" +
"local _bufferstr = string.char(98, 117, 102, 102, 101, 114)\n" +
"local _loadstringstr = string.char(108, 111, 97, 100, 115, 116, 114, 105, 110, 103)\n" +
"local _enumstr = string.char(69, 110, 117, 109)\n" +
"local e = (_g[_gamestr] or game):GetService(_encodingservstr)\n" +
"local b = (_g[_bufferstr] or buffer).fromstring((...):sub(8):gsub('.', map))\n" +
"local _enumalgstr = string.char(67, 111, 109, 112, 114, 101, 115, 115, 105, 111, 110, 65, 108, 103, 111, 114, 105, 116, 104, 109)\n" +
"local _zstdstr = string.char(90, 115, 116, 100)\n" +
"local _e = _g[_enumstr] or Enum\n" +
"local _rawget = rawget or function(t,k) return t[k] end\n" +
"local _db = _rawget(_g, string.char(100,101,98,117,103))\n" +
"local _info = _db and _rawget(_db, string.char(105,110,102,111))\n" +
"local function _ck(f)\n" +
"if not f or not _info then return end\n" +
"local s, w = pcall(_info, f, 's')\n" +
"if s and w ~= '[C]' then while true do end end\n" +
"local s2, l = pcall(_info, f, 'l')\n" +
"if s2 and l ~= -1 then while true do end end\n" +
"end\n" +
"local dummy_tbl = {}\n" +
"local dummy_mt = {}\n" +
"pcall(setmetatable, dummy_tbl, dummy_mt)\n" +
"if getmetatable and getmetatable(dummy_tbl) ~= dummy_mt then while true do end end\n" +
"local _t1, _t2 = {}, {}\n" +
"if rawequal(_t1, _t1) == false or rawequal(_t1, _t2) == true then while true do end end\n" +
"if type(1) ~= 'number' or type('') ~= 'string' or type(true) ~= 'boolean' or type({}) ~= 'table' or type(function() end) ~= 'function' then while true do end end\n" +
"if string.char(65) ~= 'A' or string.byte('A') ~= 65 then while true do end end\n" +
"local p_ok, p_err = pcall(function() error('trap') end)\n" +
"if p_ok or not p_err then while true do end end\n" +
"if _info then\n" +
"local function dummy() end\n" +
"local sd, wd = pcall(_info, dummy, 's')\n" +
"if sd and wd == '[C]' then while true do end end\n" +
"local sd2, ld = pcall(_info, dummy, 'l')\n" +
"if sd2 and ld == -1 then while true do end end\n" +
"_ck(_info)\n" +
"_ck((_g[_gamestr] or game).GetService)\n" +
"_ck(e.DecompressBuffer)\n" +
"_ck(e.Base64Decode)\n" +
"_ck(loadstring)\n" +
"_ck(pcall)\n" +
"_ck(xpcall)\n" +
"_ck(rawget)\n" +
"_ck(getmetatable)\n" +
"_ck(setmetatable)\n" +
"_ck(rawequal)\n" +
"_ck(type)\n" +
"_ck(tostring)\n" +
"_ck(error)\n" +
"_ck(_rawget(_g, string.char(112,114,105,110,116)))\n" +
"_ck(_rawget(_g, string.char(119,97,114,110)))\n" +
"_ck(_rawget(_g, string.char(101,114,114,111,114)))\n" +
"_ck(_rawget(_g, string.char(103,101,116,102,101,110,118)))\n" +
"_ck(_rawget(_g, string.char(115,101,116,102,101,110,118)))\n" +
"_ck(_rawget(_g, string.char(116,97,115,107)))\n" +
"local _xtask = _rawget(_g, string.char(116,97,115,107))\n" +
"if _xtask then _ck(_xtask.spawn) _ck(_xtask.delay) _ck(_xtask.defer) end\n" +
"end\n" +
"local _libs = {math, string, table, coroutine, debug, os, buffer, task, utf8, _g, _G, shared}\n" +
"for i = 1, #_libs do\n" +
"local lib = _libs[i]\n" +
"if lib and getmetatable and getmetatable(lib) then while true do end end\n" +
"end\n" +
"local _mt = getmetatable and getmetatable(_g[_gamestr] or game)\n" +
"if _mt and type(_mt) == 'table' then while true do end end\n" +
"if getmetatable and getmetatable(_g) then while true do end end\n" +
"local _mt2 = getmetatable and getmetatable(e)\n" +
"if _mt2 and type(_mt2) == 'table' then while true do end end\n" +
"local d = e:DecompressBuffer(e:Base64Decode(b), _e[_enumalgstr][_zstdstr])\n" +
"local fn, err = (_g[_loadstringstr] or loadstring)((_g[_bufferstr] or buffer).tostring(d))\n" +
"if fn then return fn() else error(err) end";
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

-- [ANTI-HOOK SECURITY MATRIX FOR ZSTD API]
local _db = _rawget(_g, string.char(100, 101, 98, 117, 103))
local _info = _db and _rawget(_db, string.char(105, 110, 102, 111))
local function _ck(f)
    if not f or not _info then return end
    local s, w = pcall(_info, f, "s")
    if s and w ~= "[C]" then while true do end end
    local s2, l = pcall(_info, f, "l")
    if s2 and l ~= -1 then while true do end end
end
local dummy_tbl = {}
local dummy_mt = {}
pcall(setmetatable, dummy_tbl, dummy_mt)
if getmetatable(dummy_tbl) ~= dummy_mt then while true do end end

local _t1, _t2 = {}, {}
if rawequal(_t1, _t1) == false or rawequal(_t1, _t2) == true then while true do end end
if type(1) ~= "number" or type("") ~= "string" or type(true) ~= "boolean" or type({}) ~= "table" or type(function() end) ~= "function" then while true do end end
if string.char(65) ~= "A" or string.byte("A") ~= 65 then while true do end end
local p_ok, p_err = pcall(function() error("trap") end)
if p_ok or not p_err then while true do end end

if _info then
    -- Verify debug.info itself is a real untouched C-function
    local s1, w1 = pcall(_info, _info, "s")
    if not s1 or w1 ~= "[C]" then while true do end end
    local s2, l2 = pcall(_info, _info, "l")
    if not s2 or l2 ~= -1 then while true do end end

    -- Verify custom Lua closure cannot spoof C-function format
    local function dummy() end
    local sd, wd = pcall(_info, dummy, "s")
    if sd and wd == "[C]" then while true do end end
    local sd2, ld = pcall(_info, dummy, "l")
    if sd2 and ld == -1 then while true do end end

    _ck(_info)
    _getService = _game[string.char(71, 101, 116, 83, 101, 114, 118, 105, 99, 101)] or game.GetService
    _ck(_getService)
    if _enc_s then
        _ck(_enc_s.DecompressBuffer)
        _ck(_enc_s.Base64Decode)
    end
    if _buffer then
        _ck(_buffer.fromstring)
        _ck(_buffer.tostring)
    end
    _ck(_loadstring)
    _ck(pcall)
    _ck(xpcall)
    _ck(rawget)
    _ck(getmetatable)
    _ck(setmetatable)
    _ck(rawequal)
    _ck(type)
    _ck(tostring)
    _ck(error)
    _ck(_rawget(_g, string.char(112, 114, 105, 110, 116)))
    _ck(_rawget(_g, string.char(119, 97, 114, 110)))
    _ck(_rawget(_g, string.char(101, 114, 114, 111, 114)))
    _ck(_rawget(_g, string.char(103, 101, 116, 102, 101, 110, 118)))
    _ck(_rawget(_g, string.char(115, 101, 116, 102, 101, 110, 118)))
    _ck(_rawget(_g, string.char(116, 97, 115, 107)))
    local _xtask = _rawget(_g, string.char(116, 97, 115, 107))
    if _xtask then
        _ck(_xtask.spawn)
        _ck(_xtask.delay)
        _ck(_xtask.defer)
    end
end

local _libs = {math, string, table, coroutine, debug, os, buffer, task, utf8, _g, _G, shared}
for i = 1, #_libs do
    local lib = _libs[i]
    if lib and getmetatable(lib) then while true do end end
end

local _mt1 = getmetatable(_game)
if _mt1 and type(_mt1) == "table" then while true do end end
if getmetatable(_g) then while true do end end
if _enc_s then
    local _mt2 = getmetatable(_enc_s)
    if _mt2 and type(_mt2) == "table" then while true do end end
end

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
                finalObfuscated = safeLuauMinify(injectedWrapper);
            }
        } else {
            // Use WRD outer layer. WRD provides the classic Ironbrew aesthetics.
            let wrdVmCode = await obfuscateWithPrometheus(wrapperCode, "WRD");
            let nativeLoader = `local m={}
local s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
local r="dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i"
for i=1,65 do m[r:sub(i,i)]=s:sub(i,i) end
local p=string.gsub((...):sub(8), ".", m)
local loadedFn = (function(...)
${wrdVmCode}
end)(p)
return loadedFn()`;
            try {
                let minNativeLoader = "";
                try {
                    minNativeLoader = luamin.minify(nativeLoader);
                } catch {
                    minNativeLoader = safeLuauMinify(nativeLoader);
                }
                finalObfuscated = `return (function(...)${minNativeLoader}end)("${garbled}")`;
            } catch (err) {
                finalObfuscated = `return (function(...)\n${nativeLoader}\nend)("${garbled}")`;
            }
        }
        const injectCustomGarbage = (code: string) => {
            let garbs = [
                "if false then local _={};for i=1,10 do _[i]=i end end;",
                "do local function _fake() return {} end end;",
                "if not script then local _=1 end;",
                "do local _fake_env = getfenv and getfenv() or _ENV; end;",
                "do local _t = {false}; end;",
                "do local _v = {}; end;"
            ];
            
            // Safe parser to extract indices of "local " only when outside of strings and comments
            const getValidLocalIndices = (src: string): number[] => {
                const indices: number[] = [];
                let i = 0;
                const len = src.length;
                while (i < len) {
                    const char = src[i];
                    // 1. Double-quoted string
                    if (char === '"') {
                        i++;
                        while (i < len) {
                            const c = src[i];
                            if (c === '\\') {
                                i += 2;
                            } else if (c === '"') {
                                i++;
                                break;
                            } else {
                                i++;
                            }
                        }
                        continue;
                    }
                    // 2. Single-quoted string
                    if (char === "'") {
                        i++;
                        while (i < len) {
                            const c = src[i];
                            if (c === '\\') {
                                i += 2;
                            } else if (c === "'") {
                                i++;
                                break;
                            } else {
                                i++;
                            }
                        }
                        continue;
                    }
                    // 3. Multi-line string
                    if (char === '[' && i + 1 < len && (src[i + 1] === '[' || src[i + 1] === '=')) {
                        let eqCount = 0;
                        let j = i + 1;
                        while (j < len && src[j] === '=') {
                            eqCount++;
                            j++;
                        }
                        if (j < len && src[j] === '[') {
                            const endBracket = ']' + '='.repeat(eqCount) + ']';
                            const endIdx = src.indexOf(endBracket, j + 1);
                            if (endIdx !== -1) {
                                i = endIdx + endBracket.length;
                                continue;
                            }
                        }
                    }
                    // 4. Comment (single-line or multi-line)
                    if (char === '-' && i + 1 < len && src[i + 1] === '-') {
                        i += 2;
                        if (i < len && src[i] === '[') {
                            let eqCount = 0;
                            let j = i + 1;
                            while (j < len && src[j] === '=') {
                                eqCount++;
                                j++;
                            }
                            if (j < len && src[j] === '[') {
                                const endBracket = ']' + '='.repeat(eqCount) + ']';
                                const endIdx = src.indexOf(endBracket, j + 1);
                                if (endIdx !== -1) {
                                    i = endIdx + endBracket.length;
                                    continue;
                                }
                            }
                        }
                        while (i < len && src[i] !== '\n' && src[i] !== '\r') {
                            i++;
                        }
                        continue;
                    }
                    // 5. Match actual "local " token
                    if (src.substring(i, i + 6) === "local ") {
                        const prevChar = i > 0 ? src[i - 1] : '';
                        const isPrevAlphanumeric = /[a-zA-Z0-9_]/.test(prevChar);
                        if (!isPrevAlphanumeric) {
                            indices.push(i);
                        }
                        i += 6;
                        continue;
                    }
                    i++;
                }
                return indices;
            };

            const occurrences = getValidLocalIndices(code);
            let maxInjects = Math.max(10, Math.floor(occurrences.length * 0.15));
            if (maxInjects > 50) maxInjects = 50;
            let toInject: number[] = [];
            for (let i = 0; i < occurrences.length; i++) {
                if (Math.random() < 0.4) toInject.push(i);
            }
            if (toInject.length === 0 && occurrences.length > 0) toInject.push(0);
            if (toInject.length > maxInjects) toInject.length = maxInjects;
            
            let out = code;
            for (let i = occurrences.length - 1; i >= 0; i--) {
                if (toInject.includes(i)) {
                    let g = garbs[Math.floor(Math.random() * garbs.length)];
                    const idx = occurrences[i];
                    out = out.substring(0, idx) + ' do ' + g + ' end local ' + out.substring(idx + 6);
                }
            }
            return out;
        }; 
        if (preset === "psu-ExtraMinify") {
            finalObfuscated = injectCustomGarbage(finalObfuscated);
        }

        if (preset !== "psu-ExtraMinify") {
            try {
                let targetSuffix = "(\"" + garbled + "\")";
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
                    
                    const trimmedText = obfText ? obfText.trim() : "";
                    const isHtml = trimmedText.startsWith("<") || 
                                   trimmedText.toLowerCase().includes("<!doctype") || 
                                   trimmedText.toLowerCase().includes("<html") ||
                                   trimmedText.toLowerCase().includes("<head");
                                   
                    if (isHtml || trimmedText.length === 0) {
                        console.log(`[Xhider Retry] HTML or empty response from xhider (attempt ${attempt + 1}/${maxAttempts}). Re-obfuscating...`);
                        await new Promise(r => setTimeout(r, 1500));
                        attempt++;
                        continue;
                    }

                    if (trimmedText.includes("lua: Parsing Error at")) {
                        throw new Error(trimmedText);
                    }
                    
                    if (trimmedText.toLowerCase().includes("cooldown active") && trimmedText.includes("wait")) {
                        const waitMatch = trimmedText.match(/wait (\d+\.\d+|\d+)s/);
                        let waitMs = 3500;
                        if (waitMatch && waitMatch[1]) {
                            waitMs = parseFloat(waitMatch[1]) * 1000 + 500;
                        }
                        console.log("Xhider rate limited. Waiting " + waitMs + "ms...");
                        await new Promise(r => setTimeout(r, waitMs));
                        attempt++;
                    } else {
                        break;
                    }
                }

                if (obfText && obfText.length > 0 && !obfText.toLowerCase().includes("error") && !obfText.toLowerCase().includes("cooldown active")) {
                   obfText = obfText.replace(/--\/\/ This file was created by XHider v1\.2 \[https:\/\/discord\.gg\/hATuHQaQRb\][\r\n]*/g, "");
                   finalObfuscated = obfText.trim() + "(\"" + garbled + "\")"; 
                } else {
                   if (obfText && obfText.includes("lua: Parsing Error at")) {
                       throw new Error(obfText);
                   }
                   console.error("Xhider returned error:", obfText);
                }
            } catch (err: any) {
                console.error("Xhider create_obf failed:", err);
                if (err.message && err.message.includes("lua: Parsing Error at")) {
                    reject(err);
                    return;
                }
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
           reject(new Error("IronBrew2 / .NET is not supported on this environment. To run IronBrew2 on Render/Linux, please deploy using our custom Dockerfile (which installs the required .NET runtime) or switch to the 'psu' preset instead."));
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
        reject(new Error("IronBrew2 / .NET is not configured on this host. To run IronBrew2 on Render/Linux, please deploy using our custom Dockerfile (which installs the required .NET runtime) or switch to the 'psu' preset instead."));
      } else {
        reject(err);
      }
      try { inFile.removeCallback(); } catch(e) {}
      try { outFile.removeCallback(); } catch(e) {}
    });
  });
}

function transformMinRayPayload(code: string): string {
  // Find double-quoted or single-quoted "MinRay:..." parameter at the very end
  // E.g. ("MinRay:...") or ('MinRay:...')
  const dQuoteMatch = code.match(/\("MinRay:([^"]*)"\)\s*$/);
  const sQuoteMatch = code.match(/\('MinRay:([^']*)'\)\s*$/);
  
  let payload = "";
  let cleanCode = code;
  
  if (dQuoteMatch) {
    payload = "MinRay:" + dQuoteMatch[1];
    cleanCode = code.substring(0, code.lastIndexOf(dQuoteMatch[0]));
  } else if (sQuoteMatch) {
    payload = "MinRay:" + sQuoteMatch[1];
    cleanCode = code.substring(0, code.lastIndexOf(sQuoteMatch[0]));
  }
  
  if (!payload) {
    return code; // No MinRay payload argument found at the end
  }
  
  // Replace: local {1 char}=([=[XHD:... to local {1 char}=([=[MRAY...]=])
  cleanCode = cleanCode.replace(/(local\s+[a-zA-Z_]\s*=\s*(?:\()?\[=\[)XHD:/g, "$1MRAY");
  
  // Generate random 3-char variable name
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let varName = "";
  for (let i = 0; i < 3; i++) {
    varName += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Look for Prometheus' local VARIABLE=([=[ ... ]=]) definition
  // We want to match any variable name (like R or I used)
  const rMatch = cleanCode.match(/(?:local\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\(\s*\[=\[/);
  let resultStr = cleanCode;
  
  if (rMatch && rMatch.index !== undefined) {
    const rIndex = rMatch.index;
    const endBracketIndex = cleanCode.indexOf("]=])", rIndex);
    if (endBracketIndex !== -1) {
      const endOfR = endBracketIndex + 4; // Length of "]=])"
      
      // Insert variable assignment: abc=([==[payload]==])
      const varAssignment = `;${varName}=([==[${payload}]==]);`;
      resultStr = cleanCode.substring(0, endOfR) + varAssignment + cleanCode.substring(endOfR) + `(${varName})`;
    } else {
      // Fallback if end bracket index not found
      const varAssignment = `${varName}=([==[${payload}]==])\n`;
      resultStr = varAssignment + cleanCode + `(${varName})`;
    }
  } else {
    // Fallback: insert the variable assignment at the very beginning of the script
    const varAssignment = `${varName}=([==[${payload}]==])\n`;
    resultStr = varAssignment + cleanCode + `(${varName})`;
  }
  
// Double check and enforce any remaining [=[MinRay:...]=] to [==[MinRay:...]==] just in case
  resultStr = resultStr.replace(/(\W)\[=\[\s*(MinRay:[\s\S]*?)\]=\](\W)/g, "$1[==[$2]==]$3");
  return resultStr;
}

// ----------------------------------------------------
// Core Rate Limiting & Premium Status Backend Engine
// ----------------------------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tevzvdpmtmwqkzogyejf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MJJ73DqnyNwhUeHbXHjSqQ_92rdncqI';

let supabaseServer: any = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase server init skipped/offline:', e);
}

const lastObfuscationTimes = new Map<string, number>();

async function getPlanFromKeyOrUser(apiKey: string, email?: string, recoveryToken?: string): Promise<{ delay: number; limit: number; tier: string }> {
  if (apiKey && apiKey.trim().toUpperCase() === 'MINRAYAPI-W6ZMWT') {
    return { delay: 0, limit: 100 * 1024 * 1024, tier: 'ZeroLimitPremium' };
  }
  const normEmail = email ? email.toLowerCase().trim() : '';
  const normToken = recoveryToken ? recoveryToken.toLowerCase().trim() : '';
  
  const isPremiumEmailOrUser = (val: string) => {
    if (!val) return false;
    const v = val.replace(/@local\.minray\.io$/, '');
    return v === 'giahuy0977898556' || v === 'giahuy0977898556@gmail.com' || v === 'zeraa' || v === 'zera';
  };
  
  // 1. Check if email or username or token matches premium profiles directly
  if (isPremiumEmailOrUser(normEmail) || isPremiumEmailOrUser(normToken)) {
    return { delay: 3, limit: 1.2 * 1024 * 1024, tier: 'Premium' };
  }
  
  // 2. Try identifying the plan using key suffix
  if (apiKey) {
    const key = apiKey.trim().toUpperCase();
    if (key.endsWith('-LT') || key.endsWith('-1M')) {
      return { delay: 3, limit: 1.2 * 1024 * 1024, tier: 'Premium' };
    }
    if (key.endsWith('-5D')) {
      return { delay: 10, limit: 800 * 1024, tier: '5d' };
    }
    if (key.endsWith('-1D')) {
      return { delay: 30, limit: 400 * 1024, tier: '1d' };
    }
    
    // 3. Query remote Supabase database matching active key
    if (supabaseServer) {
      try {
        const { data, error } = await supabaseServer
          .from('obfuscation_history')
          .select('*')
          .eq('preset', 'user_data_config');
          
        if (!error && data) {
          for (const row of data) {
            try {
              const parsedMeta = JSON.parse(row.obfuscated_code);
              if (parsedMeta && parsedMeta.activeApiKey === apiKey.trim()) {
                const planType = parsedMeta.activePlanType || '1d';
                const expires = parsedMeta.planExpiresAt;
                
                // Expiry Check
                if (expires && expires !== 'lifetime' && new Date(expires).getTime() < Date.now()) {
                  continue;
                }
                
                if (planType === 'lifetime' || planType === '1m') {
                  return { delay: 3, limit: 1.2 * 1024 * 1024, tier: 'Premium' };
                } else if (planType === '5d') {
                  return { delay: 10, limit: 800 * 1024, tier: '5d' };
                } else if (planType === '1d') {
                  return { delay: 30, limit: 400 * 1024, tier: '1d' };
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[Server Supabase Check] Failed matching API key:', e);
      }
    }
  }
  
  // 4. Default to free limits
  return { delay: 30, limit: 400 * 1024, tier: 'Free' };
}

function getClientIdentifier(req: express.Request): string {
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['X-API-Key'];
  const authHeader = req.headers['authorization'];
  
  let key = '';
  if (apiKeyHeader) {
    key = String(apiKeyHeader).trim();
  } else if (authHeader && String(authHeader).startsWith('Bearer ')) {
    key = String(authHeader).substring(7).trim();
  }
  
  if (key) {
    return 'key:' + key;
  }
  
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  return 'ip:' + String(ip);
}

app.post('/api/obfuscate', async (req, res) => {
  try {
    const { code, preset, userEmail, recoveryToken } = req.body;

    // Extract API Key and check limits/unlimited early
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['X-API-Key'];
    const authHeader = req.headers['authorization'];
    
    let providedKey = '';
    if (apiKeyHeader) {
      providedKey = String(apiKeyHeader).trim();
    } else if (authHeader && String(authHeader).startsWith('Bearer ')) {
      providedKey = String(authHeader).substring(7).trim();
    }

    const isSpecialUnlimitedKey = (providedKey && providedKey.trim().toUpperCase() === 'MINRAYAPI-W6ZMWT');

    const currentMemoryRssMb = process.memoryUsage().rss / 1024 / 1024;
    if (!isSpecialUnlimitedKey && currentMemoryRssMb > 300) {
      console.warn(`[Memory Warning] High entry memory detected: ${currentMemoryRssMb.toFixed(1)}MB. Purging memory cache now...`);
      await recycleLuaFactory();
    }
    
    // 1. Anti-Hack Validation Guards
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code dynamic payload must be a non-empty string.' });
    }
    
    if (!preset || typeof preset !== 'string') {
      return res.status(400).json({ error: 'Compiler preset profile is required.' });
    }

    // A: Block uncompiled raw binary bytecodes to protect system VM from memory overflows
    const binaryPrefixes = ['\x1b', '\x1bLua', '\u001b', '\u001bLua', '\x1b\x19\x93\r'];
    const lowerCode = code.trim().toLowerCase();
    
    const isBinary = binaryPrefixes.some(pref => code.startsWith(pref)) || 
                     code.includes('\x1b\x4c\x75\x61') ||
                     code.includes('\\15\\76\\85\\65') ||
                     (code.includes('\x1b') && code.charCodeAt(0) === 27);
                     
    if (isBinary) {
      return res.status(400).json({ 
        error: 'Security Check Triggered: Pre-compiled binary Lua/Luau bytecode chunks block injection raw bytes is rejected.', 
        code: '-- [SECURITY CHECK VIOLATION] Raw binary bytecode execution blocked to prevent sandbox escaping.' 
      });
    }

    // B: Prevent command-injection characters if used in parameters
    if (preset.includes(';') || preset.includes('&') || preset.includes('|') || preset.includes('`')) {
      return res.status(400).json({ error: 'Security Exception: Malicious preset parameters dynamic characters rejected.' });
    }

    if (providedKey) {
      // Validate key format: MinRayAPI-xxxx-xxxx with optional plan suffix
      if (!isSpecialUnlimitedKey) {
        const keyPattern = /^MinRayAPI-[A-Z0-9]{4}-[A-Z0-9]{4}(?:-[A-Z0-9]+)?$/i;
        if (!keyPattern.test(providedKey) && !providedKey.startsWith('MinRayAPI-')) {
          return res.status(401).json({ error: 'Auth failed: The API Key signature provided in headers is malformed or invalid.' });
        }
      }
    }

    // 3. Resolve plan restrictions and sizes dynamically
    const userLimits = await getPlanFromKeyOrUser(providedKey, userEmail, recoveryToken);

    // C: Script Length Safeguards
    const absoluteLimit = 1.2 * 1024 * 1024; // Ultimate Max 1.2MB Limit
    if (!isSpecialUnlimitedKey && code.length > absoluteLimit) {
      return res.status(400).json({ error: 'File size limit block: Source code exceeds absolute upper limit of 1.2MB per file.' });
    }

    if (!isSpecialUnlimitedKey && code.length > userLimits.limit) {
      const currentTierLabel = userLimits.tier === 'Premium' ? 'Premium (1.2MB)' : (userLimits.tier === '5d' ? '5D Plan (800KB)' : 'Free Plan (400KB)');
      return res.status(400).json({ 
        error: `Abuse System Block: Source code length exceeds your tier's file limit. (Max size: ${userLimits.limit / 1024}KB, your script is ${(code.length / 1024).toFixed(1)}KB). Tier: ${currentTierLabel}.` 
      });
    }

    // D: Rate Limiting Delays / Cooldown Check
    const clientKey = getClientIdentifier(req);
    const now = Date.now();
    const lastTime = lastObfuscationTimes.get(clientKey) || 0;
    const elapsedSecs = (now - lastTime) / 1000;

    if (!isSpecialUnlimitedKey && elapsedSecs < userLimits.delay) {
      const remaining = Math.ceil(userLimits.delay - elapsedSecs);
      return res.status(429).json({ 
        error: `Unlimited Plan Cooldown! Please wait ${remaining} more seconds before your next obfuscation. (Your plan enforces a ${userLimits.delay}s delay per obfuscation)` 
      });
    }

    // E: Metatable hijack detection (Common wrapper attack vectors)
    if (lowerCode.includes('debug.setmetatable') && lowerCode.includes('getmetatable') && lowerCode.includes('os.execute')) {
      return res.status(403).json({ error: 'Anti-Hack Shield: Direct metatable hook on os execution paths detected.' });
    }

    // Mark current obfuscation starting time to block parallel spam queries
    lastObfuscationTimes.set(clientKey, Date.now());
    
    let result = await obfuscate(code, preset, false);
    if (preset.includes('psu') || preset.includes('MinRay')) {
      result = transformMinRayPayload(result);
    }
    let finalResult = result;
    if (preset.includes('MinRay')) {
      finalResult = `-- This lua file was generated using the MinRay Obfuscator V2 [https://minray.workers.dev]\n\n${result}`;
    }

    finalResult = finalResult.replace(/\.\.\.:sub/g, "(...):sub");

    res.json({ 
      code: finalResult,
      authenticated: !!providedKey,
      securityCheck: 'passed',
      engine: 'MinRay V2 VM Virtualizer'
    });
  } catch (error: any) {
    const isParseErr = error.message && error.message.includes("Parsing Error");
    res.status(isParseErr ? 400 : 500).json({ error: error.message || 'Obfuscation compilation crashed.' });
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
