import axios from 'axios';
import * as fs from 'fs';
import { LuaFactory } from 'wasmoon';

async function test() {
  try {
    console.log("Sleeping 5 seconds for backend to settle...");
    await new Promise(r => setTimeout(r, 5000));

    const response = await axios.post('http://localhost:3000/api/obfuscate', {
      code: 'print("Hello from Wasmoon!")',
      preset: 'MinRay V2'
    });
    
    const code = response.data.code;
    fs.writeFileSync('generated_check.lua', code, 'utf-8');
    
    console.log("Loading into Wasmoon Lua VM...");
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    
    // Inject print
    lua.global.set('print', (val: any) => console.log("LUA PRINT:", val));
    
    try {
      await lua.doString(code);
      console.log("SUCCESS! Parsed and executed perfectly inside mock Luau/Lua VM!");
    } catch (err: any) {
      console.error("Wasmoon compile/exec failed:");
      console.error(err.message || err);
    } finally {
      lua.global.close();
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

test();
