const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let dllogicRegex = /const downloadPng = \([\s\S]*?ctx\.drawImage\(img, 0, 0\)[\s\S]*?\} \/\/\s*end downloadPng/m;

let newDl = `const downloadPng = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\\:\\/\\/www\\.w3\\.org\\/2000\\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\\bwidth="[^"]+"/, '');
    source = source.replace(/\\bheight="[^"]+"/, '');
    source = source.replace(/\\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, \`<svg viewBox="\${svgBBox.x - padding} \${svgBBox.y - padding} \${w} \${h}" width="\${w}" height="\${h}" \`);
    
    const canvas = document.createElement("canvas");
    const scale = 2;
    
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(scale, scale);
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, w, h);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        const a = document.createElement("a");
        a.download = \`\${title}.png\`;
        a.href = canvas.toDataURL("image/png", 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    img.src = url;
}; // end downloadPng`;

let didReplace = false;

// We didn't have // end downloadPng in the original maybe? 
// Let's use string operations instead
let oldFnStart = code.indexOf('  const downloadPng = (svgId: string, title: string) => {');
let startNextFn = code.indexOf('  return (', oldFnStart);

if (oldFnStart > -1 && startNextFn > -1) {
    let before = code.substring(0, oldFnStart);
    let after = code.substring(startNextFn);
    
    code = before + '\\n  ' + newDl + '\\n\\n  ' + after;
    fs.writeFileSync('src/App.tsx', code);
    console.log("downloadPng rewritten");
} else {
    console.log("not found");
}
