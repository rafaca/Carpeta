/*
 * Build Typography Library
 *
 * Creates the freqz.rafacastello.com text styles in the current Figma file.
 * Run via: Plugins -> Development -> Import plugin from manifest -> select manifest.json
 * Then: Plugins -> Development -> Build Typography Library
 *
 * Source of truth: text nodes in frame "Weekly Digest / April 29, 2026" (id 1:2).
 * Style values were extracted from those nodes via the Figma Plugin API.
 *
 * Set REMAP_PULPO_TO_FIRELLI = true to register Pulpo nodes under the
 * "Firelli Variable" family in the library (the script falls back to Pulpo
 * automatically if the target Firelli Variable weight is not installed).
 */

const REMAP_PULPO_TO_FIRELLI = true;

const PULPO_TO_FIRELLI_WEIGHT = {
  'Light': 'Light',
  'Regular': 'Regular',
  'Medium': 'Medium',
  'Bold': 'Bold',
};

const STYLES = [
  {
    name: 'Display/Banner',
    family: 'Giramisu VF', style: 'Straight Tight',
    size: 78, lineHeight: 74.1, letterSpacing: -1.56,
  },
  {
    name: 'Display/H1',
    family: 'Firelli Variable', style: 'Thin',
    size: 59, lineHeight: 61.95, letterSpacing: -0.59,
  },
  {
    name: 'Display/Section',
    family: 'Pulpo', style: 'Medium',
    size: 40, lineHeight: 44, letterSpacing: -0.4,
  },
  {
    name: 'Display/H2',
    family: 'Firelli Variable', style: 'Light',
    size: 37, lineHeight: 40.7, letterSpacing: -0.555,
  },
  {
    name: 'Display/H3',
    family: 'Pulpo', style: 'Medium',
    size: 28, lineHeight: 36, letterSpacing: -0.42,
  },
  {
    name: 'Display/Pullquote',
    family: 'Firelli Variable', style: 'Light Italic',
    size: 23, lineHeight: 29.9, letterSpacing: 0,
  },
  {
    name: 'Display/H4',
    family: 'Pulpo', style: 'Medium',
    size: 18, lineHeight: 23.4, letterSpacing: 0,
  },
  {
    name: 'Display/H4 Link',
    family: 'Pulpo', style: 'Regular',
    size: 18, lineHeight: 21.6, letterSpacing: 0,
    textDecoration: 'UNDERLINE',
  },
  {
    name: 'Display/Stat',
    family: 'Pulpo', style: 'Regular',
    size: 52, lineHeight: 52, letterSpacing: -1.04,
  },

  {
    name: 'Body/Standfirst',
    family: 'Shift', style: 'Medium',
    size: 17, lineHeight: 25.5, letterSpacing: 0,
  },
  {
    name: 'Body/Lead',
    family: 'Pulpo', style: 'Light',
    size: 16, lineHeight: 24, letterSpacing: 0,
  },
  {
    name: 'Body/Paragraph',
    family: 'Shift', style: 'Light',
    size: 15, lineHeight: 24, letterSpacing: 0,
  },
  {
    name: 'Body/Paragraph Bold',
    family: 'Shift', style: 'Bold',
    size: 15, lineHeight: 24, letterSpacing: 0,
  },
  {
    name: 'Body/Paragraph Link',
    family: 'Shift', style: 'Light',
    size: 15, lineHeight: 24, letterSpacing: 0,
    textDecoration: 'UNDERLINE',
  },
  {
    name: 'Body/Small',
    family: 'Shift', style: 'Light',
    size: 14, lineHeight: 20.3, letterSpacing: 0,
  },

  {
    name: 'Caption/Eyebrow',
    family: 'Panel', style: 'Medium',
    size: 14, lineHeight: 22.4, letterSpacing: 1.12,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Eyebrow Bold',
    family: 'Panel', style: 'Bold',
    size: 14, lineHeight: 22.4, letterSpacing: 1.12,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Tag',
    family: 'Panel', style: 'Medium',
    size: 14, lineHeight: 18.2, letterSpacing: 1.12,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Number',
    family: 'Pulpo', style: 'Bold',
    size: 11, lineHeight: 17.6, letterSpacing: 0.88,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Small',
    family: 'Panel', style: 'Medium',
    size: 10, lineHeight: 16, letterSpacing: 0.8,
    textCase: 'UPPER',
  },
];

async function tryLoad(font) {
  try {
    await figma.loadFontAsync(font);
    return true;
  } catch (e) {
    return false;
  }
}

async function resolveFont(spec) {
  const original = { family: spec.family, style: spec.style };
  if (REMAP_PULPO_TO_FIRELLI && spec.family === 'Pulpo') {
    const remappedStyle = PULPO_TO_FIRELLI_WEIGHT[spec.style] || spec.style;
    const remapped = { family: 'Firelli Variable', style: remappedStyle };
    if (await tryLoad(remapped)) return { font: remapped, fellBack: false };
  }
  if (await tryLoad(original)) return { font: original, fellBack: REMAP_PULPO_TO_FIRELLI && spec.family === 'Pulpo' };
  return { font: null, fellBack: false };
}

async function main() {
  const existing = await figma.getLocalTextStylesAsync();
  const existingByName = new Map(existing.map((s) => [s.name, s]));

  const created = [];
  const skipped = [];
  const failed = [];

  for (const spec of STYLES) {
    if (existingByName.has(spec.name)) {
      skipped.push(`${spec.name} (already exists)`);
      continue;
    }
    const resolved = await resolveFont(spec);
    if (!resolved.font) {
      failed.push(`${spec.name}: no loadable font for ${spec.family} ${spec.style}`);
      continue;
    }
    const ts = figma.createTextStyle();
    ts.name = spec.name;
    ts.fontName = resolved.font;
    ts.fontSize = spec.size;
    ts.lineHeight = { value: spec.lineHeight, unit: 'PIXELS' };
    ts.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
    if (spec.textCase) ts.textCase = spec.textCase;
    if (spec.textDecoration) ts.textDecoration = spec.textDecoration;

    const note = resolved.fellBack ? ' (fell back to original family)' : '';
    created.push(`${spec.name} -> ${resolved.font.family} ${resolved.font.style}${note}`);
  }

  const lines = [];
  lines.push(`Created ${created.length}:`);
  created.forEach((l) => lines.push('  + ' + l));
  if (skipped.length) {
    lines.push('');
    lines.push(`Skipped ${skipped.length}:`);
    skipped.forEach((l) => lines.push('  = ' + l));
  }
  if (failed.length) {
    lines.push('');
    lines.push(`Failed ${failed.length}:`);
    failed.forEach((l) => lines.push('  ! ' + l));
  }
  const summary = lines.join('\n');
  console.log(summary);
  figma.closePlugin(`${created.length} styles created, ${skipped.length} skipped, ${failed.length} failed. See console for detail.`);
}

main().catch((e) => {
  console.error(e);
  figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e)));
});
