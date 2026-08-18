/*
 * RCCOM Type + Capture Assets
 *
 * Two jobs, both of which have to run inside Figma Desktop rather than through
 * the MCP remote plugin context:
 *
 *   1. TYPE — point the RCCOM text styles at the families the live site
 *      actually serves (assets/type.css on rafacastello.com). The remote
 *      context has none of those faces installed, so it can neither set nor
 *      edit a style that carries one; Desktop has them.
 *   2. IMAGES — fill the capture's `IMG · <path>` placeholder frames from the
 *      live asset the frame was captured from. `figma.createImageAsync` needs
 *      real network access, which the remote context does not have.
 *
 * Run: Plugins -> Development -> Import plugin from manifest -> manifest.json,
 * then Plugins -> Development -> RCCOM Type + Capture Assets.
 * Open Plugins -> Development -> Open console for the full report.
 */

const SITE_ORIGIN = 'https://www.rafacastello.com';

// Set to false to only touch type, or only fill images.
const DO_TYPE = true;
const DO_IMAGES = true;

/*
 * Source of truth: assets/type.css.
 *
 *   --firelli  firelli-variable   titles, wght 100
 *   --questa   questa-sans        body copy (--body / --bilo resolve here)
 *   --code     code-saver         labels, nav, index numbers
 *
 *   --t-display clamp(25px, 6.4vw, 30px)   lh 1.29   ls -.02em
 *   --t-title   clamp(22px, 2.4vw, 30px)   lh 1.1
 *   --t-body    clamp(15px, 1.15vw, 18px)  lh 1.6
 *   --t-small   clamp(13px, 1.05vw, 16px)  lh 1.6
 *   --t-label   11px  tracking .18em  uppercase  600
 *
 * `styles` lists acceptable weights in order — the first one installed wins,
 * so a file missing e.g. Code Saver SemiBold still lands on Bold instead of
 * failing outright. Sizes are the desktop (max) end of each clamp, which is
 * what the 1440 captures were taken at.
 */
const STYLES = [
  {
    name: 'Display/XL',
    family: 'Firelli Variable', styles: ['Thin', 'Light', 'Regular'],
    size: 56, lineHeight: 61.6, letterSpacing: -1.12,
    description: 'type.css .t-title / work title — firelli-variable, wght 100. Live: 56 / 61.6 / -2%.',
  },
  {
    name: 'Display/L',
    family: 'Firelli Variable', styles: ['Thin', 'Light', 'Regular'],
    size: 38, lineHeight: 41.8, letterSpacing: -0.76,
    description: 'type.css .t-title — firelli-variable, wght 100.',
  },
  {
    name: 'Display/M',
    family: 'Firelli Variable', styles: ['Thin', 'Light', 'Regular'],
    size: 30, lineHeight: 38.7, letterSpacing: -0.6,
    description: 'type.css .t-display — firelli-variable, wght 100. Landing greeting + sign-off. Live: 30 / 1.29 / -2%.',
  },
  {
    name: 'Body/Large',
    family: 'Questa Sans', styles: ['Regular', 'Book', 'Light'],
    size: 18, lineHeight: 28.8, letterSpacing: 0,
    description: 'type.css .t-body, upper end of the clamp — questa-sans 400. 18 / 1.6.',
  },
  {
    name: 'Body/Base',
    family: 'Questa Sans', styles: ['Regular', 'Book', 'Light'],
    size: 15, lineHeight: 24, letterSpacing: 0,
    description: 'type.css .t-body — questa-sans 400. 15 / 1.6. Running copy, project rows, client list.',
  },
  {
    name: 'Body/Small',
    family: 'Questa Sans', styles: ['Regular', 'Book', 'Light'],
    size: 13, lineHeight: 20.8, letterSpacing: 0,
    description: 'type.css .t-small — questa-sans 400. 13 / 1.6. Lists and card copy.',
  },
  {
    name: 'Label/Nav',
    family: 'Code Saver', styles: ['SemiBold', 'Bold', 'Medium', 'Regular'],
    size: 11, lineHeight: 17.6, letterSpacing: 1.98, textCase: 'UPPER',
    description: 'type.css .t-nav — code-saver 600, 11 / .18em / uppercase.',
  },
  {
    name: 'Label/Eyebrow',
    family: 'Code Saver', styles: ['SemiBold', 'Bold', 'Medium', 'Regular'],
    size: 11, lineHeight: 17.6, letterSpacing: 1.98, textCase: 'UPPER',
    description: 'type.css .t-label — code-saver 600, 11 / .18em / uppercase. SCOPE / ROLE / YEAR, SELECT CLIENTS.',
  },
  {
    name: 'Label/Footer',
    family: 'Code Saver', styles: ['SemiBold', 'Bold', 'Medium', 'Regular'],
    size: 11, lineHeight: 17.6, letterSpacing: 1.98, textCase: 'UPPER',
    description: 'type.css .t-label — code-saver 600, 11 / .18em / uppercase. CLIENT PORTAL.',
  },
  {
    name: 'Label/Button',
    family: 'Code Saver', styles: ['SemiBold', 'Bold', 'Medium', 'Regular'],
    size: 11, lineHeight: 17.6, letterSpacing: 1.98, textCase: 'UPPER',
    description: 'type.css .t-label — code-saver 600, 11 / .18em / uppercase. BOOK A CALL, CONTACT.',
  },
  {
    name: 'Label/Micro',
    family: 'Code Saver', styles: ['SemiBold', 'Bold', 'Medium', 'Regular'],
    size: 10, lineHeight: 16, letterSpacing: 1.8, textCase: 'UPPER',
    description: 'type.css .t-label, smallest step — code-saver 600, 10 / .18em / uppercase.',
  },
  {
    name: 'Label/Index Number',
    family: 'Code Saver', styles: ['SemiBold', 'Bold', 'Medium', 'Regular'],
    size: 11, lineHeight: 11, letterSpacing: 1.98,
    description: 'Project index numbers (01–17) on the landing page — code-saver 600, 11 / 1 / .18em, accent orange.',
  },
  {
    name: 'Label/Meta Title',
    family: 'Questa Sans', styles: ['Regular', 'Book', 'Light'],
    size: 15, lineHeight: 24, letterSpacing: 0,
    description: 'Project meta values (Design system, Art direction, 2017) — questa-sans 400, 15 / 1.6.',
  },
];

async function installedStyles(family) {
  const fonts = await figma.listAvailableFontsAsync();
  return fonts
    .filter((f) => f.fontName.family === family)
    .map((f) => f.fontName.style);
}

// First installed weight from the spec's preference list, or null.
async function resolveFont(spec) {
  const available = await installedStyles(spec.family);
  if (!available.length) return null;
  for (const style of spec.styles) {
    if (available.indexOf(style) !== -1) return { family: spec.family, style };
  }
  return { family: spec.family, style: available[0] };
}

async function applyType() {
  const existing = await figma.getLocalTextStylesAsync();
  const byName = {};
  existing.forEach((s) => { byName[s.name] = s; });

  const created = [], updated = [], failed = [];

  for (const spec of STYLES) {
    const fontName = await resolveFont(spec);
    if (!fontName) {
      failed.push(`${spec.name} — family "${spec.family}" is not installed`);
      continue;
    }
    try {
      await figma.loadFontAsync(fontName);
    } catch (e) {
      failed.push(`${spec.name} — could not load ${fontName.family} ${fontName.style}: ${e.message}`);
      continue;
    }

    let style = byName[spec.name];
    const isNew = !style;
    if (isNew) {
      style = figma.createTextStyle();
      style.name = spec.name;
    } else {
      // An existing style can only be rewritten once its CURRENT font is loaded.
      try {
        await figma.loadFontAsync(style.fontName);
      } catch (e) {
        failed.push(`${spec.name} — current font ${style.fontName.family} ${style.fontName.style} is not installed, cannot rewrite`);
        continue;
      }
    }

    try {
      style.fontName = fontName;
      style.fontSize = spec.size;
      style.lineHeight = { unit: 'PIXELS', value: spec.lineHeight };
      style.letterSpacing = { unit: 'PIXELS', value: spec.letterSpacing };
      style.textCase = spec.textCase || 'ORIGINAL';
      style.description = spec.description;
      const line = `${spec.name}  ${fontName.family} ${fontName.style}  ${spec.size}/${spec.lineHeight}/${spec.letterSpacing}${spec.textCase ? ' ' + spec.textCase : ''}`;
      (isNew ? created : updated).push(line);
    } catch (e) {
      failed.push(`${spec.name} — ${e.message}`);
    }
  }

  return { created, updated, failed };
}

async function fillImagePlaceholders() {
  const filled = [], failed = [];
  const pages = figma.root.children;

  for (const page of pages) {
    await page.loadAsync();
    const frames = page.findAll((n) => n.type === 'FRAME' && n.name.indexOf('IMG · ') === 0);
    for (const frame of frames) {
      const path = frame.name.slice('IMG · '.length).trim();
      const url = path.indexOf('http') === 0 ? path : SITE_ORIGIN + path;
      try {
        const image = await figma.createImageAsync(url);
        const size = await image.getSizeAsync();
        frame.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
        // The caption only exists to label an empty placeholder.
        frame.children
          .filter((c) => c.type === 'TEXT')
          .forEach((c) => c.remove());
        filled.push(`${frame.name}  ${size.width}x${size.height}  (page "${page.name}")`);
      } catch (e) {
        failed.push(`${frame.name} — ${e.message}`);
      }
    }
  }

  return { filled, failed };
}

async function main() {
  const lines = [];
  let createdCount = 0, updatedCount = 0, filledCount = 0, failedCount = 0;

  if (DO_TYPE) {
    const t = await applyType();
    createdCount = t.created.length;
    updatedCount = t.updated.length;
    failedCount += t.failed.length;
    lines.push(`TYPE — created ${t.created.length}, updated ${t.updated.length}, failed ${t.failed.length}`);
    t.created.forEach((l) => lines.push('  + ' + l));
    t.updated.forEach((l) => lines.push('  ~ ' + l));
    t.failed.forEach((l) => lines.push('  ! ' + l));
  }

  if (DO_IMAGES) {
    const i = await fillImagePlaceholders();
    filledCount = i.filled.length;
    failedCount += i.failed.length;
    lines.push('');
    lines.push(`IMAGES — filled ${i.filled.length}, failed ${i.failed.length}`);
    i.filled.forEach((l) => lines.push('  + ' + l));
    i.failed.forEach((l) => lines.push('  ! ' + l));
  }

  console.log(lines.join('\n'));
  figma.closePlugin(
    `${createdCount} styles created, ${updatedCount} updated, ${filledCount} images filled, ${failedCount} failed. See console.`
  );
}

main().catch((e) => {
  console.error(e);
  figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e)));
});
