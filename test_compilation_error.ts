import * as fs from 'fs';
import { LuaFactory } from 'wasmoon';

async function test() {
  try {
    const code = fs.readFileSync('generated_check.lua', 'utf-8');
    
    const regex = /([a-zA-Z_][a-zA-Z0-9_]*),m=P\(e,w,"MinRay  ",nil\);/;
    const match = code.match(regex);
    
    if (!match) {
      console.error("Target pattern not found!");
      return;
    }
    
    const randomVar = match[1];
    
    const target = `${randomVar},m=P(e,w,"MinRay  ",nil);`;
    const replacement = `
    print("--- w LENGTH:", #w)
    print("--- w FIRST 200 CHARS (HEX):")
    local hex = ""
    for i=1,math.min(#w, 200) do
      hex = hex .. string.format("%02X ", string.byte(w, i))
    end
    print(hex)
    print("--- w FIRST 200 CHARS (ASCII):")
    print(string.sub(w, 1, 200))
    local bq, m, err = P(e, w, "MinRay  ", nil); 
    print("DEBUG COMPILATION ERROR:", tostring(err)); 
    ${randomVar},m=bq,m;`;
    
    const modifiedCode = code.replace(target, replacement);
    
    console.log("Running decompressed source analysis...");
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
