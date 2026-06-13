import { LuaFactory } from 'wasmoon';
import * as fs from 'fs';

async function run() {
  const factory = new LuaFactory();
  const lua = await factory.createEngine();

  // Set standard prints
  lua.global.set('print', (...args) => {
    console.log('[LUA OUTPUT]', ...args);
  });

  // Inject mock bit32 and Roblox proxy API with throw on wait/task.wait
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
        defer = function(f, ...)
            print("task.defer called")
        end,
        spawn = function(f, ...)
            print("task.spawn called")
        end,
        delay = function(d, f, ...)
            print("task.delay called")
        end
    }
    
    wait = function(...)
        error("WAIT_YIELD_EXIT")
    end
    
    delay = function(...)
    end

    setreadonly = function() end
    getrawmetatable = function() return {} end
    hookmetamethod = function() return function() end end
    hookfunction = function() return function() end end
    newcclosure = function(f) return f end
  `);

  console.log("Reading bytecode / deobfuscated_output.lua...");
  const code = fs.readFileSync('deobfuscated_output.lua', 'utf-8');

  console.log("Executing in WebAssembly sandboxed Lua VM...");
  try {
    const result = await lua.doString(code);
    console.log("Execution finished successfully!");
    if (result) {
      console.log("Result:", result);
    }
  } catch (err) {
    console.error("LUA EXECUTION ERROR:", err.message);
  } finally {
    lua.global.close();
  }
}

run();
