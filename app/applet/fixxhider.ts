const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.ts', 'utf-8');

const badStartStr = `} catch (err) {
            console.error("Xhider create_obf failed:", err);
        }
       }

        try {
            let targetSuffix = ;`;

const badBlockRegex = /\} catch \(err\) \{\n            console\.error\("Xhider create_obf failed:", err\);\n        \}\n       \}\n\n        try \{\n            let targetSuffix = ;[\s\S]*?            console\.error\("Xhider create_obf failed:", err\);\n        \}/;

let newBlock = `
        if (preset !== "psu-ExtraMinify") {
            try {
                let targetSuffix = '("' + garbled + '")';
                let vmLogic = finalObfuscated;
                if (finalObfuscated.endsWith(targetSuffix)) {
                    vmLogic = finalObfuscated.substring(0, finalObfuscated.length - targetSuffix.length);
                }
                
                let attempt = 0;
                let maxAttempts = 5;
                let obfText = "";
                while (attempt < maxAttempts) {
                    const xhiderRes = await fetch("https://xhider.xyz/", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            action: "create_obf",
                            api_token: "e7ec2a4cd8eaa07a3b66ca2add917ba4",
                            preset: "obf lz",
                            content: vmLogic,
                            output: "console"
                        })
                    });
                    
                    obfText = await xhiderRes.text();
                    
                    if (obfText && obfText.toLowerCase().includes("cooldown active") && obfText.includes("wait")) {
                        const waitMatch = obfText.match(/wait (\\d+\\.\\d+|\\d+)s/);
                        let waitMs = 3500;
                        if (waitMatch && waitMatch[1]) {
                            waitMs = parseFloat(waitMatch[1]) * 1000 + 500;
                        }
                        console.log("Xhider rate limited. Waiting " + waitMs + "ms...");
                        await new Promise(r => setTimeout(r, waitMs));
                        attempt++;
                    } else {
                        break;
                    }
                }

                if (obfText && obfText.length > 0 && !obfText.toLowerCase().includes("error") && !obfText.toLowerCase().includes("cooldown active")) {
                   obfText = obfText.replace(/--\\/\\/ This file was created by XHider v1\\.2 \\[https:\\/\\/discord\\.gg\\/hATuHQaQRb\\][\\r\\n]*/g, "");
                   finalObfuscated = obfText.trim() + targetSuffix; 
                } else {
                   console.error("Xhider returned error:", obfText);
                }
            } catch (err) {
                console.error("Xhider create_obf failed:", err);
            }
        }
`;

code = code.replace(badBlockRegex, newBlock);
fs.writeFileSync('/app/applet/server.ts', code);
console.log("Fixed!");
