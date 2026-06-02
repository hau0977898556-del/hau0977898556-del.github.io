const fs = require('fs');
let text = fs.readFileSync('temp_server.ts', 'utf8');

text = text.replace('useGarble = false; // Fast runtime, no gsub drop', 'useGarble = true; // Fast runtime but keep garbling');

const newWrapperForNotWrds = `local map = {}
local std = ""
for _, c in ipairs({65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47,61}) do std = std .. string.char(c) end
local rnd = "dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i"
for i=1, 65 do map[rnd:sub(i,i)] = std:sub(i,i) end
local setfenv_str = string.char(115, 101, 116, 102, 101, 110, 118)
local _g = _G and _G[setfenv_str] and _G[setfenv_str]() or getfenv and getfenv() or _ENV
local _gamestr = string.char(103, 97, 109, 101)
local _encodingservstr = string.char(69, 110, 99, 111, 100, 105, 110, 103, 83, 101, 114, 118, 105, 99, 101)
local _bufferstr = string.char(98, 117, 102, 102, 101, 114)
local _loadstringstr = string.char(108, 111, 97, 100, 115, 116, 114, 105, 110, 103)
local _enumstr = string.char(69, 110, 117, 109)
local e = (_g[_gamestr] or game):GetService(_encodingservstr)
local b = (_g[_bufferstr] or buffer).fromstring((...):sub(7):gsub(".", map))
local _enumalgstr = string.char(67, 111, 109, 112, 114, 101, 115, 115, 105, 111, 110, 65, 108, 103, 111, 114, 105, 116, 104, 109)
local _zstdstr = string.char(90, 115, 116, 100)
local _e = _g[_enumstr] or Enum
local d = e:DecompressBuffer(e:Base64Decode(b), _e[_enumalgstr][_zstdstr])
local fn, err = (_g[_loadstringstr] or loadstring)((_g[_bufferstr] or buffer).tostring(d))
if fn then return fn() else error(err) end`;

let originalWrapper = `        if (!useWrds) {
            wrapperCode = \`local _g = getfenv and getfenv() or _ENV
local e = (_g.game or game):GetService("EncodingService")
local d = e:DecompressBuffer(e:Base64Decode((...):sub(7)), (_g.Enum or Enum).CompressionAlgorithm.Zstd)
local fn, err = (_g.loadstring or loadstring)((_g.buffer or buffer).tostring(d))
if fn then return fn() else error(err) end\`;`;

text = text.replace(originalWrapper, '        if (!useWrds) {\n            wrapperCode = `' + newWrapperForNotWrds + '`;');

text = text.replace('useGarble = false;\n                useWrds = false;\n            } catch', 'useGarble = true;\n                useWrds = false;\n            } catch');

fs.writeFileSync('final_server.ts', text);
console.log('Success make!');
