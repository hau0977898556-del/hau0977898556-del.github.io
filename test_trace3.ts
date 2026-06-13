import * as fs from 'fs';
import { LuaFactory } from 'wasmoon';

async function test() {
  try {
    const code = fs.readFileSync('generated_check.lua', 'utf-8');
    
    // We will find the line containing "MinRay decompression error" and print w and m instead
    const targetPattern = /d\(\s*\w+\s+and\s+m\s+and\s+G\(m\s*\)\s*==\s*['"]function['"]\s*,\s*["']MinRay decompression error:[^)]*\)/;
    
    // Let's replace the last few assertions with a custom print or block
    const lines = code.split('\n');
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('MinRay decompression error')) {
        lines[i] = `
          if not (true and m and G(m) == 'function') then
            print("--- PRINTING DECOMPRESSED w START ---")
            print(tostring(w))
            print("--- PRINTING DECOMPRESSED w END ---")
            print("DEBUG compilation status m: ", tostring(m))
          end
          d(true and m and G(m)=='function' or false, "Decompression assertion failed");
        `;
        replaced = true;
        break;
      }
    }
    
    if (!replaced) {
      console.error("Could not find the assertion target pattern!");
      return;
    }
    
    const modifiedCode = lines.join('\n');
    
    console.log("Running decompressed source extraction...");
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    
    lua.global.set('print', (...args: any[]) => console.log("LUA PRINT:", ...args));
    
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
