local Unparser = require('psu/Prometheus-0.2.9/src/prometheus/unparser')
local Ast = require('psu/Prometheus-0.2.9/src/prometheus/ast')

local unp = Unparser:new({LuaVersion = 5})  -- or LuaU
local stmt1 = Ast.LocalVariableDeclaration(nil, {1}, {Ast.NumberExpression(1)})
-- we need proper scope and things, it's hard to mock.
