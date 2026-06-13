import { LuaFactory } from 'wasmoon';
import * as fs from 'fs';

async function run() {
  const factory = new LuaFactory();
  const lua = await factory.createEngine();

  // Set standard prints to capture tracing
  lua.global.set('print', (...args) => {
    console.log('[LUA PRINT]', ...args);
  });

  // Inject Roblox mocks
  await lua.doString(`
    bit32 = {
      rrotate = function(n, disp)
        return n
      end,
      replace = function(n, v, f, w)
        return n
      end
    }

    local function make_mock(name)
        local mock = {}
        setmetatable(mock, {
            __index = function(t, k)
                -- print("ROBLOX MOCK ACCESS:", name .. "." .. tostring(k))
                if k == "IsLoaded" then
                    return function() return true end
                elseif k == "HttpGet" or k == "HttpGetAsync" then
                    return function(self, url)
                        print("INTERCEPTED HTTP GET:", url)
                        error("HTTP_GET_INTERCEPT_EXIT: " .. tostring(url))
                    end
                elseif k == "GetState" or k == "Loaded" then
                    return true
                elseif k == "wait" then
                    return function(...)
                        error("TASK_WAIT_YIELD_EXIT")
                    end
                end
                return make_mock(name .. "." .. tostring(k))
            end,
            __call = function(t, ...)
                if name == "game.wait" or name == "game.task.wait" then
                    error("WAIT_YIELD_EXIT")
                end
                -- print("ROBLOX MOCK CALL:", name, ...)
                return make_mock(name .. "()")
            end,
            __tostring = function()
                return name
            end
        })
        return mock
    end

    game = make_mock("game")
    workspace = make_mock("workspace")
    shared = make_mock("shared")
    
    task = {
        wait = function(...)
            error("TASK_WAIT_YIELD_EXIT")
        end,
        defer = function(f, ...) end,
        spawn = function(f, ...) end,
        delay = function(d, f, ...) end
    }
    
    wait = function(...)
        error("WAIT_YIELD_EXIT")
    end
    
    delay = function(...) end

    setreadonly = function() end
    getrawmetatable = function() return {} end
    hookmetamethod = function() return function() end end
    hookfunction = function() return function() end end
    newcclosure = function(f) return f end
  `);

  console.log("Reading deobfuscated_output.lua...");
  let code = fs.readFileSync('deobfuscated_output.lua', 'utf-8');

  // Inject instruction-limiting trace into 'while K do'
  const target = 'while K do';
  if (!code.includes(target)) {
    console.error("ERROR: 'while K do' not found in source!");
    return;
  }

  const traceCode = `
    local _inst_cnt = 0
    while K do
      _inst_cnt = _inst_cnt + 1
      if _inst_cnt < 200 then
        print("TRACE STATE K =", tostring(K))
      else
        print("TRACE STATE K =", tostring(K))
        error("TRACE_VM_SAFE_LIMIT")
      end
  `;

  const modifiedCode = code.replace(target, traceCode);
  
  console.log("Running patched VM with state tracing...");
  try {
    await lua.doString(modifiedCode);
    console.log("Patched VM completed execution!");
  } catch (err) {
    console.warn("VM EXIT REASON:", err.message);
  } finally {
    lua.global.close();
  }
}

run();
