import { LuaFactory } from 'wasmoon';
import * as fs from 'fs';

async function run() {
  const factory = new LuaFactory();
  const lua = await factory.createEngine();

  const code = fs.readFileSync('deobfuscator.lua', 'utf-8');

  lua.global.set('print', (...args: any[]) => console.log(...args));

  try {
    await lua.doString(code);
  } catch (err: any) {
    console.error("LUA INNER RUN ERROR:", err.message);
  } finally {
    lua.global.close();
  }
}

run();
