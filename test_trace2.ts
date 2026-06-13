import * as fs from 'fs';
import { LuaFactory } from 'wasmoon';

async function test() {
  try {
    const code = fs.readFileSync('generated_check.lua', 'utf-8');
    
    // Modify function _ to log when t[Z] is nil
    const target = 'local function _(t,Z)local g,T,o=V_/2048,t[Z];';
    const replacement = `local function _(t,Z)
      local T = t[Z];
      if T == nil then
        local len = 0
        if type(t) == "table" then
          for k,v in pairs(t) do len = len + 1 end
        end
        print("DEBUG: NIL value! Z="..tostring(Z)..", table_type="..type(t)..", total_keys="..tostring(len))
      end
      local g,T,o=V_/2048,t[Z];`;
    
    if (!code.includes(target)) {
      console.error("Target string not found!");
      return;
    }
    
    const modifiedCode = code.replace(target, replacement);
    
    console.log("Running nested tracer for nil keys...");
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
