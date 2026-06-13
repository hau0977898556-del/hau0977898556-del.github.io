-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- cli.lua
--
-- This Script contains the Code for the Prometheus CLI.

-- Configure package.path for requiring Prometheus.
local function script_path()
	local str = debug.getinfo(2, "S").source:sub(2)
	return str:match("(.*[/%\\])")
end
package.path = script_path() .. "?.lua;" .. package.path
---@diagnostic disable-next-line: different-requires
local Prometheus = require("prometheus")
Prometheus.Logger.logLevel = Prometheus.Logger.LogLevel.Info

-- Check if the file exists
local function file_exists(file)
	local f = io.open(file, "rb")
	if f then
		f:close()
	end
	return f ~= nil
end

string.split = function(str, sep)
	local fields = {}
	local pattern = string.format("([^%s]+)", sep)
	str:gsub(pattern, function(c)
		fields[#fields + 1] = c
	end)
	return fields
end

-- get all lines from a file, returns an empty
-- list/table if the file does not exist
local function lines_from(file)
	if not file_exists(file) then
		return {}
	end
	local lines = {}
	for line in io.lines(file) do
		lines[#lines + 1] = line
	end
	return lines
end

-- CLI
local config, sourceFile, outFile, luaVersion, prettyPrint

Prometheus.colors.enabled = true

-- Parse Arguments
local i = 1
while i <= #arg do
	local curr = arg[i]
	if curr:sub(1, 2) == "--" then
		if curr == "--preset" or curr == "--p" then
			if config then
				Prometheus.Logger:warn("The config was set multiple times")
			end

			i = i + 1
			local preset = Prometheus.Presets[arg[i]]
			if not preset then
				Prometheus.Logger:error(string.format('A Preset with the name "%s" was not found!', tostring(arg[i])))
			end

			config = preset
		elseif curr == "--config" or curr == "--c" then
			i = i + 1
			local filename = tostring(arg[i])
			if not file_exists(filename) then
				Prometheus.Logger:error(string.format('The config file "%s" was not found!', filename))
			end

			local content = table.concat(lines_from(filename), "\n")
			-- Load Config from File
			local func = loadstring(content)
			-- Sandboxing
			setfenv(func, {})
			config = func()
		elseif curr == "--out" or curr == "--o" then
			i = i + 1
			if outFile then
				Prometheus.Logger:warn("The output file was specified multiple times!")
			end
			outFile = arg[i]
		elseif curr == "--nocolors" then
			Prometheus.colors.enabled = false
		elseif curr == "--Lua51" then
			luaVersion = "Lua51"
		elseif curr == "--LuaU" then
			luaVersion = "LuaU"
		elseif curr == "--pretty" then
			prettyPrint = true
		elseif curr == "--saveerrors" then
			-- Override error callback
			Prometheus.Logger.errorCallback = function(...)
				print(Prometheus.colors(Prometheus.Config.NameUpper .. ": " .. ..., "red"))

				local args = { ... }
				local message = table.concat(args, " ")

				local fileName = sourceFile:sub(-4) == ".lua" and sourceFile:sub(0, -5) .. ".error.txt"
					or sourceFile .. ".error.txt"
				local handle = io.open(fileName, "w")
				handle:write(message)
				handle:close()

				os.exit(1)
			end
		else
			Prometheus.Logger:warn(string.format('The option "%s" is not valid and therefore ignored', curr))
		end
	else
		if sourceFile then
			Prometheus.Logger:error(string.format('Unexpected argument "%s"', arg[i]))
		end
		sourceFile = tostring(arg[i])
	end
	i = i + 1
end

if not sourceFile then
	Prometheus.Logger:error("No input file was specified!")
end

if not config then
	Prometheus.Logger:warn("No config was specified, falling back to Minify preset")
	config = Prometheus.Presets.Minify
end

-- Add Option to override Lua Version
config.LuaVersion = luaVersion or config.LuaVersion
config.PrettyPrint = prettyPrint ~= nil and prettyPrint or config.PrettyPrint

if not file_exists(sourceFile) then
	Prometheus.Logger:error(string.format('The File "%s" was not found!', sourceFile))
end

if not outFile then
	if sourceFile:sub(-4) == ".lua" then
		outFile = sourceFile:sub(0, -5) .. ".obfuscated.lua"
	else
		outFile = sourceFile .. ".obfuscated.lua"
	end
end

local source = table.concat(lines_from(sourceFile), "\n")
local out
if config.IsMinRay then
	Prometheus.Logger:info("Connecting to MinRay V2 Cloud Obfuscation Engine...")
	
	-- Function to escape JSON string in pure Lua
	local function escape_json_string(str)
		local result = {}
		for j = 1, #str do
			local c = str:sub(j, j)
			if c == '\\' then
				table.insert(result, '\\\\')
			elseif c == '"' then
				table.insert(result, '\\"')
			elseif c == '\n' then
				table.insert(result, '\\n')
			elseif c == '\r' then
				table.insert(result, '\\r')
			elseif c == '\t' then
				table.insert(result, '\\t')
			else
				local code = string.byte(c)
				if code < 32 then
					table.insert(result, string.format('\\u%04x', code))
				else
					table.insert(result, c)
				end
			end
		end
		return table.concat(result)
	end

	-- Function to decode JSON string in pure Lua
	local function decode_json_string(str, start_pos)
		local char = str:sub(start_pos, start_pos)
		if char ~= '"' then return nil, start_pos end
		
		local result = {}
		local j = start_pos + 1
		local length = #str
		while j <= length do
			local c = str:sub(j, j)
			if c == '"' then
				return table.concat(result), j + 1
			elseif c == '\\' then
				local next_c = str:sub(j+1, j+1)
				if next_c == 'n' then
					table.insert(result, '\n')
				elseif next_c == 'r' then
					table.insert(result, '\r')
				elseif next_c == 't' then
					table.insert(result, '\t')
				elseif next_c == 'b' then
					table.insert(result, '\b')
				elseif next_c == 'f' then
					table.insert(result, '\f')
				elseif next_c == '\\' then
					table.insert(result, '\\')
				elseif next_c == '/' then
					table.insert(result, '/')
				elseif next_c == '"' then
					table.insert(result, '"')
				elseif next_c == 'u' then
					local hex = str:sub(j+2, j+5)
					local code = tonumber(hex, 16)
					if code then
						if code < 128 then
							table.insert(result, string.char(code))
						else
							if code < 2048 then
								table.insert(result, string.char(192 + math.floor(code / 64)) .. string.char(128 + (code % 64)))
							else
								table.insert(result, string.char(224 + math.floor(code / 4096)) .. string.char(128 + math.floor((code % 4096) / 64)) .. string.char(128 + (code % 64)))
							end
						end
					end
					j = j + 4
				else
					table.insert(result, next_c)
				end
				j = j + 2
			else
				table.insert(result, c)
				j = j + 1
			end
		end
		return nil, start_pos
	end

	-- Function to decode simple JSON response from MinRay
	local function decode_json_simple(str)
		local res = {}
		local j = 1
		local length = #str
		while j <= length do
			local char = str:sub(j, j)
			if char == '"' then
				local key, next_j = decode_json_string(str, j)
				if key then
					j = next_j
					while j <= length and str:sub(j,j) ~= ':' do
						j = j + 1
					end
					if str:sub(j,j) == ':' then
						j = j + 1
						while j <= length and (str:sub(j,j) == ' ' or str:sub(j,j) == '\t' or str:sub(j,j) == '\n' or str:sub(j,j) == '\r') do
							j = j + 1
						end
						if str:sub(j,j) == '"' then
							local val, val_next = decode_json_string(str, j)
							if val then
								res[key] = val
								j = val_next
							end
						end
					end
				else
					j = j + 1
				end
			else
				j = j + 1
			end
		end
		return res
	end

	-- Escape the source code to save as JSON
	local escapedSource = escape_json_string(source)
	local json_payload = '{"code":"' .. escapedSource .. '","preset":"MinRay V2"}'
	
	-- Write to temp JSON file to fully bypass shell argument length / escape characters limitation
	local temp_json_path = sourceFile .. ".minray_temp.json"
	local json_file = io.open(temp_json_path, "w")
	if not json_file then
		Prometheus.Logger:error("Failed to create temporary compilation payload file!")
	end
	json_file:write(json_payload)
	json_file:close()
	
	-- Build the secure system execution query
	local cmd = 'curl -s -X POST "https://minray-obfuscator-production.up.railway.app/api/obfuscate" ' ..
	            '-H "Content-Type: application/json" ' ..
	            '-H "X-API-Key: MinRayAPI-W6ZMWT" ' ..
	            '-d @' .. string.format('"%s"', temp_json_path)
	
	local pipe = io.popen(cmd)
	local response = pipe:read("*all")
	pipe:close()
	
	-- Clean up temp JSON payload file
	os.remove(temp_json_path)
	
	if not response or response == "" then
		Prometheus.Logger:error("Empty response or request timeout connection to MinRay API.")
	end
	
	local parsed = decode_json_simple(response)
	if parsed.error then
		Prometheus.Logger:error("MinRay Server Compilation Error: " .. parsed.error)
	elseif parsed.code then
		out = parsed.code
		Prometheus.Logger:info("MinRay V2 Obfuscation completed successfully!")
	else
		Prometheus.Logger:error("Failed parsing MinRay API Response. Response body: " .. response)
	end
else
	local pipeline = Prometheus.Pipeline:fromConfig(config)
	out = pipeline:apply(source, sourceFile)
end
Prometheus.Logger:info(string.format('Writing output to "%s"', outFile))

-- Write Output
local handle = io.open(outFile, "w")
handle:write(out)
handle:close()
