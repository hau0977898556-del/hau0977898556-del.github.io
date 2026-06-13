import * as fs from 'fs';
import { LuaFactory } from 'wasmoon';

async function test() {
  try {
    const code = fs.readFileSync('generated_check.lua', 'utf-8');
    
    console.log("Loading into Lua to test G() decoding directly...");
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    
    lua.global.set('print', (...args: any[]) => console.log("LUA PRINT:", ...args));
    
    const lines = code.split('\n');
    const returnLine = lines.find(l => l.startsWith('return(function()'));
    if (!returnLine) {
      console.error("Return line not found!");
      return;
    }
    
    // Extract base85 match
    const matchK = code.match(/local K=G\(\s*\[=*\[\s*(.*?)\s*\]=*\]\s*\);/s);
    // Find the second G() call
    const matchesAll = Array.from(code.matchAll(/local [a-zA-Z_][a-zA-Z0-9_]*=G\(\s*\[=*\[\s*(.*?)\s*\]=*\]\s*\);/sg));
    const matchV = matchesAll[1]; // The second match is randomVar
    
    const b85_K_match = matchK ? matchK[1] : "";
    const b85_V_match = matchV ? matchV[1] : "";
    
    const customLua = `
      local unpack = unpack or table.unpack
      local string = string
      local pcall, assert, tostring, setmetatable = pcall, assert, tostring, setmetatable
      local G, v, u, N, Q, _sub = {}, string.gsub, string.char, string.byte, string.pack, string.sub;
      for Q=0,255 do G[Q]=u(Q);end;
      local K = 5;
      ${returnLine.substring(returnLine.indexOf('G=function('), returnLine.indexOf('local K=G('))}
      
      local b85_K_match = [=[${b85_K_match}]=]
      local b85_V_match = [=[${b85_V_match}]=]
      
      print("b85_K length:", #b85_K_match)
      print("b85_V length:", #b85_V_match)
      
      local decoded_K = G(b85_K_match)
      local decoded_V = G(b85_V_match)
      
      print("decoded_K length:", #decoded_K)
      print("decoded_V length:", #decoded_V)
      
      -- Print first 20 bytes hex of decoded_K
      local hex = ""
      for i=1,math.min(#decoded_K, 20) do
        hex = hex .. string.format("%02X ", string.byte(decoded_K, i))
      end
      print("decoded_K hex:", hex)
    `;
    
    fs.writeFileSync('temp_test_g.lua', customLua, 'utf-8');
    
    try {
      await lua.doString(customLua);
    } catch (err: any) {
      console.error("Compilation error in Lua check:", err.message || err);
    } finally {
      lua.global.close();
    }
    
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

test();
