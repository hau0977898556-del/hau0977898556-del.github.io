--[[
 ____  __.                            ________ ___.     _____                           __                
|    |/ _|____   ________________     \_____  \\_ |___/ ____\_ __  ______ ____ _____ _/  |_  ___________ 
|      <_/ __ \_/ __ \_  __ \__  \     /   |   \| __ \   __\  |  \/  ___// ___\\__  \\   __\/  _ \_  __ \
|    |  \  ___/\  ___/|  | \// __ \_  /    |    \ \_\ \  | |  |  /\___ \\  \___ / __ \|  | (  <_> )  | \/
|____|__ \___  >\___  >__|  (____  /  \_______  /___  /__| |____//____  >\___  >____  /__|  \____/|__|   
        \/   \/     \/           \/           \/    \/                \/     \/     \/                   
          This file was protected by Keera Obfuscator v1.2 BETA
]]--


local _fake_env = getfenv and getfenv() or _ENV; local a={}local b=''for c,d in ipairs({65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47,61})do b=b..string.char(d)end;local e='dIHBWMeYjX(~,cGF}!gL#U?:-|RSO^bP&/*AET)QfD]C;khV.=[{+ZKa$_J%><N@i'for f=1,65 do a[e:sub(f,f)]=b:sub(f,f)end;local g=string.char(115,101,116,102,101,110,118)local h=_G and _G[g]and _G[g]()or getfenv and getfenv()or _ENV;local _v = {}; local i=string.char(103,97,109,101)if false then local _={};for i=1,10 do _[i]=i end end; local j=string.char(69,110,99,111,100,105,110,103,83,101,114,118,105,99,101)local k=string.char(98,117,102,102,101,114)local l=string.char(108,111,97,100,115,116,114,105,110,103)local m=string.char(69,110,117,109)local n=(h[i]or game):GetService(j)local o=(h[k]or buffer).fromstring(("Keera:(~#V@gdR+}ddOYXDSQ}fXK/TSe=VjeU$^YX/S?ThR?|_X[Ei"):sub(7):gsub('.',a))local _fake_env = getfenv and getfenv() or _ENV; local p=string.char(67,111,109,112,114,101,115,115,105,111,110,65,108,103,111,114,105,116,104,109)local q=string.char(90,115,116,100)local r=h[m]or Enum;local function _fake() return {} end; local s=n:DecompressBuffer(n:Base64Decode(o),r[p][q])if false then local _={};for i=1,10 do _[i]=i end end; local t,u=(h[l]or loadstring)((h[k]or buffer).tostring(s))if t then return t()else error(u)end