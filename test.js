const { LuaFactory } = require('wasmoon'); async function run() { const lua = await new LuaFactory().createEngine(); await lua.doString(`
local b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local b64dec = {}
for i = 1, 64 do b64dec[string.sub(b64chars, i, i)] = i - 1 end
local function decodeB64(str)
    str = string.gsub(str, '[^'..b64chars..'=]', '')
    local res = {}
    local len = #str
    for i = 1, len, 4 do
        local c1, c2, c3, c4 = string.sub(str, i, i), string.sub(str, i+1, i+1), string.sub(str, i+2, i+2), string.sub(str, i+3, i+3)
        local n1, n2, n3, n4 = b64dec[c1] or 0, b64dec[c2] or 0, b64dec[c3] or 0, b64dec[c4] or 0
        local n = n1 * 262144 + n2 * 4096 + n3 * 64 + n4
        table.insert(res, string.char(math.floor(n / 65536) % 256, math.floor(n / 256) % 256, n % 256))
    end
    local pad = 0
    if string.sub(str, -1) == '=' then pad = pad + 1 end
    if string.sub(str, -2, -2) == '=' then pad = pad + 1 end
    local finalStr = table.concat(res)
    if pad > 0 then finalStr = string.sub(finalStr, 1, -(pad+1)) end
    return finalStr
end
local function decLZW(data)
    local dict = {}
    for i = 0, 255 do dict[i] = string.char(i) end
    local dictSize = 256
    local b1, b2 = string.byte(data, 1, 2)
    local w = string.char(b1 * 256 + b2)
    local res = {w}
    for i = 3, #data, 2 do
        local b1, b2 = string.byte(data, i, i+1)
        local k = (b1 or 0) * 256 + (b2 or 0)
        local entry = ''
        if dict[k] then entry = dict[k]
        elseif k == dictSize then entry = w .. string.sub(w, 1, 1)
        else error('Bad dict') end
        table.insert(res, entry)
        if dictSize < 65535 then
            dict[dictSize] = w .. string.sub(entry, 1, 1)
            dictSize = dictSize + 1
        end
        w = entry
    end
    return table.concat(res)
end
print(decLZW(decodeB64('AFQATwBCAEUATwBSAE4ATwBUAQABAgEEAQkBAwEFAQc=')))
`); } run();