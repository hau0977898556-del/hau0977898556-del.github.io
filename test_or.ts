import { LuaFactory } from 'wasmoon';

async function test() {
  const factory = new LuaFactory();
  const lua = await factory.createEngine();
  try {
    const code = `
      local w,u,d,S,K,e,j,v,G,P=setmetatable,string.char,assert,tostring,5,loadstring,unpack or table.unpack,string.gsub,{},pcall;
      print("SUCCESS compile!")
    `;
    await lua.doString(code);
  } catch (err: any) {
    console.error("ERROR compiling code segment:");
    console.error(err.message || err);
  } finally {
    lua.global.close();
  }
}

test();
