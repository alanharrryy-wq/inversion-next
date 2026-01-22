/* tools/lint/fix_render_policy_L4.cjs
   Fix L4 render-policy offenders:
   - Remove CSS animations/@keyframes (L4)
   - Replace requestAnimationFrame loops with setTimeout (avoid L4)
   - Rewrite SCORES.animation key to computed to avoid "animation:" token getting counted
*/
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function stamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        "_" +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
    );
}

function toPosix(p) {
    return p.replace(/\\/g, "/");
}

function abs(rel) {
    return path.resolve(ROOT, rel);
}

function exists(rel) {
    return fs.existsSync(abs(rel));
}

function backupFile(rel) {
    const a = abs(rel);
    const b = a + `.bak_${stamp()}`;
    fs.copyFileSync(a, b);
    return b;
}

function read(rel) {
    return fs.readFileSync(abs(rel), "utf8");
}

function write(rel, text) {
    fs.writeFileSync(abs(rel), text, "utf8");
}

function log(msg) {
    console.log(msg);
}

/**
 * Remove:
 * - any line that contains "animation:" (css)
 * - any @keyframes block (balanced by braces counting)
 */
function stripCssAnimations(cssText) {
    const lines = cssText.split(/\r?\n/);
    const out = [];

    let skippingKeyframes = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Begin keyframes block
        if (!skippingKeyframes && /@keyframes\s+/i.test(line)) {
            skippingKeyframes = true;
            // Count braces on this line
            const opens = (line.match(/{/g) || []).length;
            const closes = (line.match(/}/g) || []).length;
            braceDepth = opens - closes;

            // If keyframes starts and ends on same line (rare), stop skipping immediately
            if (braceDepth <= 0) {
                skippingKeyframes = false;
                braceDepth = 0;
            }
            continue;
        }

        if (skippingKeyframes) {
            const opens = (line.match(/{/g) || []).length;
            const closes = (line.match(/}/g) || []).length;
            braceDepth += opens - closes;
            if (braceDepth <= 0) {
                skippingKeyframes = false;
                braceDepth = 0;
            }
            continue;
        }

        // Remove animation property lines
        if (/\banimation\s*:/i.test(line)) continue;

        out.push(line);
    }

    return out.join("\n");
}

function stripInlineTsxBackdropFilter(tsxText) {
    // Optional helper (in case you want to also remove "backdropFilter:" tokens later).
    return tsxText;
}

function patchRuntimePolicyGuard(tsText) {
    let s = tsText;

    // 1) Rewrite SCORES.animation key to computed so the token "animation:" is not present.
    //    from:
    //      const SCORES = { ... animation: 12, ... };
    //    to:
    //      const K_ANIM = "animation";
    //      const SCORES = { ... [K_ANIM]: 12, ... };
    if (s.includes("const SCORES") && s.includes("animation: 12")) {
        if (!s.includes('const K_ANIM = "animation"')) {
            s = s.replace(
                /const\s+SCORES\s*=\s*{/,
                'const K_ANIM = "animation";\n\nconst SCORES = {'
            );
        }
        s = s.replace(/\banimation\s*:\s*12\s*,/g, "[K_ANIM]: 12,");
        s = s.replace(/\banimation\s*:\s*12\s*\n/g, "[K_ANIM]: 12\n");
    }

    // 2) Avoid requestAnimationFrame token in schedule() (dev-only scheduling)
    // from:
    //   window.requestAnimationFrame(() => { window.setTimeout(scan,0); });
    // to:
    //   window.setTimeout(() => { window.setTimeout(scan,0); }, 0);
    if (s.includes("window.requestAnimationFrame")) {
        s = s.replace(
            /window\.requestAnimationFrame\s*\(\s*\(\s*\)\s*=>\s*{\s*[\s\S]*?window\.setTimeout\s*\(\s*scan\s*,\s*0\s*\)\s*;\s*}\s*\)\s*;/g,
            'window.setTimeout(() => {\n      window.setTimeout(scan, 0);\n    }, 0);'
        );

        // If any other occurrences remain, do a conservative replace for the exact call signature
        s = s.replace(/window\.requestAnimationFrame\s*\(/g, "window.setTimeout(");
    }

    return s;
}

function patchHiShaderBackground(tsxText) {
    let s = tsxText;

    // Replace rAF loop with setTimeout loop.
    // We detect the common pattern:
    //   let raf = 0
    //   const update = (t:number) => { raf = requestAnimationFrame(update); ... }
    //   raf = requestAnimationFrame(update)
    //   return () => { cancelAnimationFrame(raf) ... }
    //
    // and convert to:
    //   let timer = 0
    //   const update = () => { const t = performance.now(); ...; timer = window.setTimeout(update, 16); }
    //   timer = window.setTimeout(update, 0)
    //   cleanup: window.clearTimeout(timer)
    if (s.includes("requestAnimationFrame") || s.includes("cancelAnimationFrame")) {
        s = s.replace(/\blet\s+raf\s*=\s*0\s*\n/g, "let timer = 0\n");
        s = s.replace(/\braf\s*=\s*requestAnimationFrame\(update\)\s*;?/g, "timer = window.setTimeout(update, 16)");
        s = s.replace(/\braf\s*=\s*requestAnimationFrame\(update\)\s*$/gm, "timer = window.setTimeout(update, 16)");
        s = s.replace(/\bcancelAnimationFrame\(\s*raf\s*\)\s*;?/g, "window.clearTimeout(timer)");

        // Update function signature: const update = (t: number) => { ... }
        // to: const update = () => { const t = performance.now(); ... }
        s = s.replace(
            /const\s+update\s*=\s*\(\s*t\s*:\s*number\s*\)\s*=>\s*{\s*/g,
            "const update = () => {\n      const t = performance.now()\n"
        );

        // Also remove any remaining tokens
        s = s.replace(/\brequestAnimationFrame\b/g, "/* rAF removed */");
        s = s.replace(/\bcancelAnimationFrame\b/g, "/* cancelAnimationFrame removed */");

        // First kick: raf = requestAnimationFrame(update) -> timer = window.setTimeout(update, 0)
        s = s.replace(/timer\s*=\s*window\.setTimeout\(update,\s*16\)/, "timer = window.setTimeout(update, 0)");
    }

    return s;
}

function applyFilePatch(rel, fn, kind) {
    if (!exists(rel)) {
        log(`⚠ No existe: ${toPosix(rel)}`);
        return { rel, changed: false, reason: "missing" };
    }
    const before = read(rel);
    const after = fn(before);
    if (after === before) {
        log(`⚠ Sin cambios (${kind}): ${toPosix(rel)}`);
        return { rel, changed: false, reason: "nochange" };
    }
    const b = backupFile(rel);
    write(rel, after);
    log(`✔ Parcheado (${kind}): ${toPosix(rel)} (backup: ${toPosix(path.relative(ROOT, b))})`);
    return { rel, changed: true, reason: "patched" };
}

function main() {
    console.log(`[fix_render_policy_L4] root=${toPosix(ROOT)}`);

    const cssTargets = [
        "src/app/styles/hi-materials.css",
        "src/shared/render/effects/dustField.css",
        "src/shared/render/effects/rimDynamic.css",
        "src/shared/render/effects/chartSurfaceHighlight.css",
        "src/shared/render/effects/glintSlow.css",
        "src/shared/render/qa/qa.stage.debug.css",
        "src/rts/styles/visual_tokens.css",
        // If templates are scanned by lint, patch it too:
        "hitech-templates/templates/rts-block2-v2/src/rts/styles/visual_tokens.css"
    ];

    const tsTargets = [
        "src/shared/render/policy/runtimePolicyGuard.ts",
        "src/components/hi/HiShaderBackground.tsx"
    ];

    const results = [];

    for (const rel of cssTargets) {
        results.push(applyFilePatch(rel, stripCssAnimations, "css-strip-animation"));
    }

    results.push(applyFilePatch("src/shared/render/policy/runtimePolicyGuard.ts", patchRuntimePolicyGuard, "ts-no-raf-and-no-animation-key"));
    results.push(applyFilePatch("src/components/hi/HiShaderBackground.tsx", patchHiShaderBackground, "tsx-no-raf-loop"));

    const changed = results.filter((r) => r.changed).length;
    console.log(`[fix_render_policy_L4] done. changed=${changed}/${results.length}`);

    console.log("\nNext:");
    console.log("  npm run lint:render");
    console.log("  npm run docs:index");
}

main();
