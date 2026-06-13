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
import lzma from 'lzma';

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

export async function obfuscateWithPrometheus(code: string, presetLevel: string, isOld: boolean = false, noCFF: boolean = false): Promise<string> {
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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
            { Name = "Vmify", Settings = { NoCFF = ${noCFF} } },
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

interface LuaToken {
  type: 'string' | 'comment' | 'code';
  value: string;
}

function tokenizeLua(code: string): LuaToken[] {
  const tokens: LuaToken[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];
    const nextChar = code[i + 1] || "";

    // 1. Double-quoted string
    if (char === '"') {
      let start = i;
      i++; // skip quote
      while (i < len) {
        if (code[i] === '\\') {
          i += 2; // skip backslash and escaped char
        } else if (code[i] === '"') {
          i++; // skip ending quote
          break;
        } else {
          i++;
        }
      }
      tokens.push({ type: 'string', value: code.substring(start, i) });
      continue;
    }

    // 2. Single-quoted string
    if (char === "'") {
      let start = i;
      i++; // skip quote
      while (i < len) {
        if (code[i] === '\\') {
          i += 2; // skip backslash and escaped char
        } else if (code[i] === "'") {
          i++; // skip ending quote
          break;
        } else {
          i++;
        }
      }
      tokens.push({ type: 'string', value: code.substring(start, i) });
      continue;
    }

    // 3. Comments (single-line or block)
    if (char === '-' && nextChar === '-') {
      let start = i;
      i += 2; // skip "--"
      
      // Check if it's a block comment: --[[ or --[====[
      if (i < len && code[i] === '[') {
        let eqCount = 0;
        let j = i + 1;
        while (j < len && code[j] === '=') {
          eqCount++;
          j++;
        }
        if (j < len && code[j] === '[') {
          i = j + 1; // past second `[`
          const endBracket = ']' + '='.repeat(eqCount) + ']';
          const endIdx = code.indexOf(endBracket, i);
          if (endIdx !== -1) {
            i = endIdx + endBracket.length;
            tokens.push({ type: 'comment', value: code.substring(start, i) });
            continue;
          } else {
            i = len;
            tokens.push({ type: 'comment', value: code.substring(start, i) });
            continue;
          }
        }
      }
      
      // Single-line comment
      while (i < len && code[i] !== '\n' && code[i] !== '\r') {
        i++;
      }
      tokens.push({ type: 'comment', value: code.substring(start, i) });
      continue;
    }

    // 4. Long bracket string: `[[` or `[=[` etc.
    if (char === '[' && (nextChar === '[' || nextChar === '=')) {
      let eqCount = 0;
      let j = i + 1;
      while (j < len && code[j] === '=') {
        eqCount++;
        j++;
      }
      if (j < len && code[j] === '[') {
        let start = i;
        i = j + 1; 
        const endBracket = ']' + '='.repeat(eqCount) + ']';
        const endIdx = code.indexOf(endBracket, i);
        if (endIdx !== -1) {
          i = endIdx + endBracket.length;
          tokens.push({ type: 'string', value: code.substring(start, i) });
          continue;
        } else {
          i = start;
        }
      }
    }

    // 5. Code segment
    let start = i;
    while (i < len) {
      const c = code[i];
      const nextC = code[i + 1] || "";
      if (c === '"' || c === "'" || (c === '-' && nextC === '-') || (c === '[' && (nextC === '[' || nextC === '='))) {
        break;
      }
      i++;
    }
    tokens.push({ type: 'code', value: code.substring(start, i) });
  }

  return tokens;
}

function getSafeLuaLongBracketWrapper(content: string): string {
  const rx = /\](=*)\]/g;
  const usedCounts = new Set<number>();
  let match;
  while ((match = rx.exec(content)) !== null) {
    usedCounts.add(match[1].length);
  }
  let numEquals = 0;
  while (usedCounts.has(numEquals)) {
    numEquals++;
  }
  const eq = "=".repeat(numEquals);
  return `[${eq}[${content}]${eq}]`;
}

function compressSpacesLua(code: string): string {
  const tokens = tokenizeLua(code);
  let result = '';
  for (const token of tokens) {
    if (token.type === 'string') {
      result += token.value;
    } else if (token.type === 'comment') {
      result += ' ';
    } else {
      let chunk = token.value;
      chunk = chunk.replace(/\s+/g, ' ');
      chunk = chunk.replace(/\s*([()\[\]{}<>=~,;:+\-*\/%^#!])\s*/g, "$1");
      result += chunk;
    }
  }
  return result.trim();
}

function safeLuauMinify(code: string): string {
    return compressSpacesLua(code);
}

const antiEnvLoggerLua = `if not game:IsLoaded()then pcall(function()game.Loaded:Wait()end)end local _g=getfenv and getfenv()or _ENV local _rawget,_rawset,_rawequal,_type,_typeof,_tostring,_pcall,_error,_math_floor,_os_clock,_string_format,_table_insert=rawget,rawset,rawequal,type,typeof,tostring,pcall,error,math.floor,os.clock,string.format,table.insert local function v13()_pcall(function()_error("MinRay Security Violation")end)end local function check_env()local t=task if _type(t)~="table"or _type(t.spawn)~="function"or _type(t.wait)~="function"or _type(t.delay)~="function"then return false end local ok=false t.spawn(function()ok=true end)_pcall(t.wait,0)return ok end if not check_env()then v13()end local _,partErr=_pcall(function()(Instance.new("Part")):__InvalidMethodXYZ123__()end)if not partErr then v13()end local function verify_services()local gs=game.GetService local svcs={"Players","Workspace","Lighting","ReplicatedStorage","RunService","UserInputService","TweenService","SoundService","CollectionService","HttpService"}for _,s in ipairs(svcs)do if not gs(game,s)then return false end end return true end if not verify_services()then v13()end local function verify_mt()local _t,_k,_v={},"__sentinel_key__",{}_rawset(_t,_k,_v)if not _rawequal(_rawget(_t,_k),_v)then return false end return true end if not verify_mt()then v13()end local sys_flags={luauValue=_ENV==nil or _VERSION=="Luau",gameUserdata=_type(game)=="userdata",wsUserdata=_type(workspace)=="userdata",instTable=_type(Instance)=="table",taskTable=_type(task)=="table",bit32Table=_type(bit32)=="table",bufferTable=_type(buffer)=="table",coClose=_type(coroutine.close)=="function"}local flag_count=0 for _,f in pairs(sys_flags)do if f then flag_count=flag_count+1 end end if flag_count<5 then v13()end local function check_hooks() end check_hooks()local executor_funcs={identifyexecutor,getexecutorname,getreg,getloadedmodules}local detected_ex=0 for _,f in ipairs(executor_funcs)do if _type(f)=="function"then detected_ex=detected_ex+1 end end local last_beat=_os_clock()task.spawn(function()while true do task.wait(0.5)local now=_os_clock()local diff=now-last_beat last_beat=now check_hooks()if not verify_mt()then v13()end end end)`;

function compressLZMA(data: Buffer): Promise<Buffer> {
  return new Promise((resolve) => {
    lzma.compress(data, 1, (result) => {
      resolve(Buffer.from(result));
    });
  });
}

function encodeBase85Special(buf: Buffer): string {
  const alphabet = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';
  let result = '';
  const padding = (4 - (buf.length % 4)) % 4;
  const paddedBuf = Buffer.concat([buf, Buffer.alloc(padding, 0)]);
  for (let i = 0; i < paddedBuf.length; i += 4) {
    const b0 = paddedBuf[i];
    const b1 = paddedBuf[i+1];
    const b2 = paddedBuf[i+2];
    const b3 = paddedBuf[i+3];
    
    let V = b0 + b1 * 256 + b2 * 65536 + b3 * 16777216;
    if (V < 0) V += 4294967296;
    
    let chars = '';
    let rem = V;
    for (let k = 0; k < 5; k++) {
      const digit = rem % 85;
      chars = alphabet[digit] + chars;
      rem = Math.floor(rem / 85);
    }
    result += chars;
  }
  return result;
}

function encodeLatinBase52(buf: Buffer): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < buf.length; i++) {
    const B = buf[i];
    const high = Math.floor(B / 52);
    const low = B % 52;
    result += alphabet[high] + alphabet[low];
  }
  return result;
}

export function obfuscate(code: string, preset: string, antiFormat: boolean = false, noCFF: boolean = false): Promise<string> {
  code = convertLuauStringInterpolation(code);

  if (preset === "psu-Minify") {
    try {
      return Promise.resolve(luamin.minify(code));
    } catch (err) {
      return Promise.resolve(safeLuauMinify(code));
    }
  }

  // Before obfuscation, minify the code first to improve execution performance and shrink subsequent AST/VM size
  // For files larger than 20KB, skip the slow AST-parsing luamin.minify and use safeLuauMinify to be incredibly fast
  if (code.length < 20000) {
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
  } else {
    try {
      code = safeLuauMinify(code);
    } catch (fallbackErr) {
      console.error("Safe fallback minification failed:", fallbackErr);
    }
  }

  if (preset === "MinRay V2" || preset === "MinRay W?" || preset === "psu-Compressed" || preset === "psu-ExtraMinify") {
    return new Promise(async (resolve, reject) => {
      try {
        // No timeout limit as requested
        // For ExtraMinify, we just completely strip variables using luamin, then compress directly.
        // For Compressed, we use Prometheus 'InnerCompressed' to tightly encrypt strings within the logic.
        let targetCode = code;
        if (preset.includes("MinRay")) {
          targetCode = antiEnvLoggerLua + "\n" + code;
        }

        let innerPayload = "";
        let useGarble = true;
        let useWrds = true;

        if (preset === "psu-ExtraMinify") {
            if (targetCode.length < 20000) {
                try {
                    // For max FPS in game (0 FPS fix), we don't use ANY Prometheus steps internally.
                    innerPayload = luamin.minify(targetCode);
                    useGarble = true; 
                    useWrds = false;
                } catch (minErr) {
                    innerPayload = safeLuauMinify(targetCode);
                    useGarble = true;
                    useWrds = false;
                }
            } else {
                innerPayload = safeLuauMinify(targetCode);
                useGarble = true;
                useWrds = false;
            }
        } else {
            // MinRay V2 / psu-Compressed
            innerPayload = await obfuscateWithPrometheus(targetCode, "InnerCompressed", false, noCFF);
            useGarble = true;
            useWrds = true;
        }
        
        const decoy = `local WmA,uWk="!!w_            2   ","      y7J_+]R.                             Q       M        7        z ......!!!"\n`;
        innerPayload = decoy + innerPayload;
        
        // Compress using high-performance LZMA!
        const lzmaCompressedPayload = await compressLZMA(Buffer.from(innerPayload, 'utf8'));

        // Let's construct the inner security/decompressor code w!
        const innerSecuritySource = `local K = ...
assert(K, "Invalid payload")

local _pcall = pcall or function(f, ...) return f(...) end

-- Ambient environmental validations
if not game:IsLoaded() then _pcall(function() game.Loaded:Wait() end) end

-- Execute the decrypted main payload!
local fn, err = loadstring(K)
if fn then
    return fn()
else
    error(err)
end`;

        let minifiedSecurity = innerSecuritySource;
        try {
            minifiedSecurity = luamin.minify(innerSecuritySource);
        } catch (minErr) {
            try {
                minifiedSecurity = safeLuauMinify(innerSecuritySource);
            } catch (fallbackErr) {
                console.error("Failed to minify inner security code, using raw:", fallbackErr);
            }
        }
        
        // Compress the inner security code using LZMA
        const lzmaCompressedSecurity = await compressLZMA(Buffer.from(minifiedSecurity, 'utf8'));
        
        // Encode appropriately depending on preset (Latin vs Base85)
        const isLatin = preset === "MinRay W?";
        const b85Upper = isLatin ? encodeLatinBase52(lzmaCompressedSecurity) : encodeBase85Special(lzmaCompressedSecurity);
        
        // Generate random 2-character variable name for Q
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const excludedVars = ["w", "u", "d", "S", "K", "e", "j", "v", "G", "P", "Q", "z", "N"];
        let randomVar = "";
        while (true) {
            let candidate = "";
            for (let i = 0; i < 2; i++) {
                candidate += charset[Math.floor(Math.random() * charset.length)];
            }
            if (!excludedVars.includes(candidate)) {
                randomVar = candidate;
                break;
            }
        }
        
        // Encode the lower compressed payload
        const b85Lower = isLatin ? encodeLatinBase52(lzmaCompressedPayload) : encodeBase85Special(lzmaCompressedPayload);
        
        let gDecoder = "";
        if (isLatin) {
            gDecoder = `G=function(m)m=_sub(m,K);return v(m,"..",function(v)local b1,b2=N(v,1,2);local val=(b1>=97 and b1-97 or b1-65+26)*52+(b2>=97 and b2-97 or b2-65+26);return u(val);end);end`;
        } else {
            gDecoder = `G=function(m)m=_sub(m,K);m=v(m,"z","!!!!!");return v(m,".....",function(c)local z,m,W,O,h=N(c,1,5);local V=(h-33)+(O-33)*85+(W-33)*7225+(m-33)*614125+(z-33)*52200625;return Q("<I4",V);end);end`;
        }

        const prefix = isLatin ? "LATN" : "MRAY";
        let finalObfuscated = `return(function()local w,u,d,S,K,e,j,v,G,P=setmetatable,string.char,assert,tostring,5,loadstring or load,unpack or table.unpack,string.gsub,{},pcall;for Q=0,255 do G[Q]=u(Q);end;local Q,_sub,N=string.pack,string.sub,string.byte;do G={65479,{0x1B,0x4C,0x75,0x61,0x50},S(e)};for m=1,#G do local W=G[m];local O={P(e,m%2==0 and u(j(W))or W,nil,nil)};if O[1]and P(O[2])~=not O[3]then K=10.0;end;end;end;${gDecoder};local K=G(${getSafeLuaLongBracketWrapper(prefix + b85Upper)});K=_sub(K,1,${lzmaCompressedSecurity.length});local ${randomVar}=G(${getSafeLuaLongBracketWrapper(prefix + b85Lower)});${randomVar}=_sub(${randomVar},1,${lzmaCompressedPayload.length});G=type;local z={[0]=1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536,131072,262144,524288,1048576,2097152,4194304,8388608,16777216,33554432,67108864,134217728,268435456,536870912,1073741824,2147483648,4294967296};local m=function(W,expectedSize) W=_sub(W,14);local O,h,V_,L=0,0,0xFFFFFFFF,#W;local r=function()O=O+1;return N(W,O,O) or 0;end;local N=0;for W=1,5 do N=N*256+r();end;local function W(X)local x=0;for _=X,1,-1.0 do V_=V_/2;V_=V_-V_%1;x=x*2;if not(N<V_)then N=N-V_;x=x+1;end;if V_<=0x00FFFFFF then V_=V_*256;N=N*256+r();end;end;return x;end;local X,x={[0]=0},"";local function _(t,Z)local g,T,o=V_/2048,t[Z];g=g-g%1;local s=g*T;if N<s then V_=s;g=(2048-T)/32;g=g-g%1;T=T+g;o=0;else V_=V_-s;N=N-s;local g=T/32;g=g-g%1;T=T-g;o=1;end;t[Z]=T;if V_<=0x00FFFFFF then V_=V_*256;N=N*256+r();end;return o;end;local N={[0]=0,0,0,0,1,2,3,4,5,6,4,5};local function K_(r,t,Z)local g=1;for T=1,t do g=g*2+_(Z,g);end;return(g-r);end;local function r(t,Z,g)local T,o=0,1;for s=0,t-1 do local t=_(g,Z+o);o=o*2+t;T=T+t*z[s];end;return T;end;local function t(Z,g)local T=1;for o=7,0,-1 do local s=(Z/z[o])%2;s=s-s%1;local o=_(g,T+(s*256)+256);T=T*2+o;if s~=o then while T<0x100 do T=T*2+_(g,T);end;break;end;end;return(T%256);end;local Z=0;local function g(T,o)if _(o,1)==0 then return K_(8,3,o[3][T]);elseif _(o,2)==0 then return 8+K_(8,3,o[4][T]);end;return K_(256,8,o[5])+16.0;end;local function T(o)local s={};for q=0,o-1 do s[q]=1024.0;end;return s;end;local function o(s,q)local J={};for y=0,s-1 do local s={};J[y]=s;for y=0,q-1 do s[y]=1024.0;end;end;return J;end;local function s()return{1024.0,1024.0,o(4,8),o(4,8),T(256)};end;local function q()local J,y,F,n,U,A,H,R,l,c,E,B,k,C,D,Y=o(8,0x300),0,0,o(12,4),T(12),T(12),T(12),0,T(12),o(12,4),o(4,64),T(115.0),T(16),s(),s(),0;while Z<expectedSize do local O=(Z%4);if _(n[h],O)==0 then local L=X[Z];local T=L/z[5.0];T=T-T%1;L=J[T];Z=Z+1;X[Z]=h<7 and K_(256,8,L)or t(X[Z-Y-1],L);h=N[h];else local p;if _(U,h)~=0 then if _(A,h)==0 then if _(c[h],O)==0 then h=h<7 and 9 or 11;p=1;end;else local L;if _(H,h)==0 then L=F;else if _(l,h)==0 then L=R;else L=y;y=R;end;R=F;end;F=Y;Y=L;end;if not p then h=h<7 and 8 or 11;p=2+g(O,D);end;else y=R;R=F;F=Y;p=2+g(O,C);local O=p-2;if 4<=O then O=3.0;end;Y=K_(64,6,E[O]);if Y>=4 then O=Y;local V=O/2-1;V=V-V%1;Y=(2+O%2)*z[V];if O<14 then Y=Y+r(V,Y-O,B);else Y=Y+(W(V-4)*16)+r(4,0,k);if Y==0xFFFFFFFF then return p==2;end;end;end;h=h<7 and 7 or 10;if Y>=Z then return false;end;end;local z=Z+p;for w=Z+1,z do X[w]=X[w-Y-1];end;Z=z;end;end;return false;end;q();P(e,w({},{__tostring=function()X=nil;end}),nil,nil);q=#X;for w=1,q,7997 do local z=w+7996.0;if z>q then z=q;end;x=x..u(j(X,w,z));end;return x;end;local w=m(K, ${Buffer.byteLength(minifiedSecurity, 'utf8')});K=m(${randomVar}, ${Buffer.byteLength(innerPayload, 'utf8')});\n${randomVar},m=P(e,w,"MinRay  ",nil);d(${randomVar} and m and G(m)=='function',"MinRay decompression error: "..S(m).." (does your environment support load/loadstring?)");return m(K);end)(...)`;
        
        // Wait a few MS to let JS event loop clear up
        await new Promise(r => setTimeout(r, 10));
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
                const tokens = tokenizeLua(src);
                const indices: number[] = [];
                let currentIndex = 0;
                for (const token of tokens) {
                    if (token.type === 'code') {
                        let idx = token.value.indexOf("local ");
                        while (idx !== -1) {
                            const prevChar = idx > 0 ? token.value[idx - 1] : '';
                            const isPrevAlphanumeric = /[a-zA-Z0-9_]/.test(prevChar);
                            const nextChar = token.value[idx + 6] || '';
                            const isNextAlphanumeric = /[a-zA-Z0-9_]/.test(nextChar);
                            
                            if (!isPrevAlphanumeric && !isNextAlphanumeric) {
                                indices.push(currentIndex + idx);
                            }
                            idx = token.value.indexOf("local ", idx + 6);
                        }
                    }
                    currentIndex += token.value.length;
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

        resolve(finalObfuscated);
      } catch (err) {
        reject(err);
      }
    });
  }
  
  if (preset.startsWith("psuOld-")) {
    const level = preset.split("-")[1];
    return obfuscateWithPrometheus(code, level, true, noCFF);
  }

  if (preset.startsWith("psu-")) {
    const level = preset.split("-")[1];
    return obfuscateWithPrometheus(code, level, false, noCFF);
  }
  
  if (preset === "psu") {
    return obfuscateWithPrometheus(code, "Medium", false, noCFF);
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

function getRandomLuaVarName(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const allChars = chars + "0123456789_";
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return result;
}

function getSafeSplitIndices(str: string): number[] {
  const safeIndices: number[] = [];
  let inDouble = false;
  let inSingle = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (!inDouble && !inSingle) {
      if (char === ' ' || char === ';') {
        safeIndices.push(i);
      }
    }
  }

  return safeIndices;
}

function stripLuaComments(code: string): string {
  const tokens = tokenizeLua(code);
  return tokens.map(t => t.type === 'comment' ? ' ' : t.value).join('');
}

function formatToExactlyThreeLines(code: string): string {
  let watermark = "-- Obfuscated by Prometheus";
  
  // Extract leading comments to use as the Watermark list
  const lines = code.split(/\r?\n/);
  const leadingComments: string[] = [];
  let codeStartIdx = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('--')) {
      leadingComments.push(trimmed);
      codeStartIdx = i + 1;
    } else if (trimmed === '') {
      codeStartIdx = i + 1;
    } else {
      break;
    }
  }
  
  if (leadingComments.length > 0) {
    watermark = leadingComments.join(' ');
  }
  
  // Get all body code, strip trailing and inline comments cleanly
  const bodyText = lines.slice(codeStartIdx).join("\n");
  const commentStrippedBody = stripLuaComments(bodyText);
  
  // Condense spaces extremely tightly around special characters
  const singleLineCode = compressSpacesLua(commentStrippedBody);
  
  return `${watermark}\n\n${singleLineCode}`;
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
    const { code, preset, userEmail, recoveryToken, noCFF } = req.body;

    const noCffBool = noCFF === true || noCFF === "true";

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
    
    let result = await obfuscate(code, preset, false, noCffBool);
    const isCompressedPreset = preset === "MinRay V2" || preset === "MinRay W?" || preset === "psu-Compressed" || preset === "psu-ExtraMinify";
    if ((preset.includes('psu') || preset.includes('MinRay')) && !isCompressedPreset) {
      result = transformMinRayPayload(result);
    }
    let finalResult = result;
    if (preset.includes('MinRay')) {
      const headerPreset = preset === "MinRay W?" ? "W?" : "V2";
      finalResult = `-- This lua file was generated using the MinRay Obfuscator ${headerPreset} [https://minray.workers.dev]\n\n${result}`;
    }

    finalResult = finalResult.replace(/\.\.\.:sub/g, "(...):sub");

    if ((preset.includes('psu') || preset.includes('MinRay')) && !isCompressedPreset) {
      finalResult = formatToExactlyThreeLines(finalResult);
    }

    res.json({ 
      code: finalResult,
      authenticated: !!providedKey,
      securityCheck: 'passed',
      engine: preset === "MinRay W?" ? "MinRay W? Latin VM Virtualizer" : 'MinRay V2 VM Virtualizer'
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

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.cjs') || process.argv[1].endsWith('server.js'))) {
  startServer();
}
