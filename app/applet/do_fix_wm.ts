import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');
const b64 = 'LS1bWwogX19fXyAgX18uICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9fX19fX19fIF9fXy4gICAgIF9fX19fICAgICAgICAgICAgICAgICAgICAgICAgICAgX18gICAgICAgICAgICAgICAgCnwgICAgfC8gX3xfX19fICAgX19fX19fX19fX19fX19fXyAgICAgXFxfX19fXyAgXFxcXF8gfF9fXy8gX19fX1xcXyBfXyAgX19fX19fIF9fX18gX19fX18gXy8gIHxfICBfX19fX19fX19fXyAKfCAgICAgIDxfLyBfXyBcXF8vIF9fIFxcXyAgX18gXFxfXyAgXFwgICAgIC8gICB8ICAgXFx8IF9fIFxcICAgX19cXCAgfCAgXFwvICBfX18vLyBfX19cXFxcX18gIFxcXFwgICBfX1xcLyAgXyBcXF8gIF9fIFxcCnwgICAgfCAgXFwgIF9fXy9cWCAgX19fL3wgIHwgXFwvLyBfXyBcXF8gIC8gICAgfCAgICBcXCBcXF9cXCBcWCAgfCB8ICA|ICAvXFxfX18gXFxcXCAgXFxfX18gLyBfXyBcXHwgIHwgKCAgPF8+ICkgIHwgXFwvCnxfX19ffF9fIFxcX19fICA+XFxfX18gID5fX3wgIChfX19fICAvICBcXF9fX19fX18gIC9fX18gIC9fX3wgfF9fX18vL19fX18gID5cXFxfX18gID5fX19fICAvX198ICBcXFxfX19fL3xffCAgIAogICAgICAgIFxcLyAgIFxcLyAgICAgXFwvICAgICAgICAgICBcXC8gICAgICAgICAgIFxcLyAgICBcXC8gICAgICAgICAgICAgICAgXFwvICAgICBcXC8gICAgIFxcLyAgICAgICAgICAgICAgICAgICAKICAgICAgICAgIFRoaXMgZmlsZSB3YXMgcHJvdGVjdGVkIGJ5IEtlZXJhIE9iZnVzY2F0b3IgdjEuMiBCRVRBCl1dLS0KCg==';

const decodedText = Buffer.from(b64, 'base64').toString('utf8');

let lines = code.split('\n');
let m = false;
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes("if (preset.includes('psu')) {")) {
        lines[i+1] = "      finalResult = `" + decodedText + "${result}`;";
        m=true;
    }
}
if (m) {
    fs.writeFileSync('server.ts', lines.join('\n'));
    console.log('Successfully fixed');
} else {
    console.log('Not found');
}
