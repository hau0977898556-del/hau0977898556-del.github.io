import * as fs from 'fs';
import { LuaFactory } from 'wasmoon';

async function test() {
  try {
    const code = fs.readFileSync('generated_check.lua', 'utf-8');
    
    // Modify r() to fall back to 0, and modify the error handler or loop to print Z
    const target = 'local r=function()O=O+1;return N(W,O,O);end;';
    const replacement = `local r=function()
      O=O+1;
      local byteVal = N(W,O,O);
      if byteVal == nil then
        print("DEBUG: r() returned nil! O="..tostring(O)..", L="..tostring(L)..", Z="..tostring(Z))
      end
      return byteVal;
    end;`;
    
    if (!code.includes(target)) {
      console.error("Target string not found!");
      return;
    }
    
    const modifiedCode = code.replace(target, replacement);
    
    console.log("Running decompressor tracer...");
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    
    lua.global.set('print', (val: any) => console.log("LUA PRINT:", val));
    
    try {
      await lua.doString(modifiedCode);
      console.log("Success!");
    } catch (err: any) {
      console.error("Execution failed:");
      console.error(err.message || err);
    } finally {
      lua.global.close();
    }
    
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

test();
