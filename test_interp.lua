local CustomGeneration = {
Vector3 = (function()
local temp = {}
for i,v in Vector3 do
if type(v) == 'vector' then
temp[v] = `Vector3.{i}`
end
end
return temp
end)()
};