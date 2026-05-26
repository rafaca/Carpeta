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
 *
 * Set TAG_NODES = true to also walk every page and link unstyled text nodes
 * to a matching style after creation. Matching is by font family + style +
 * size + line height + letter spacing + text case + text decoration. Nodes
 * with mixed properties or already linked to a style are skipped.
 */

const REMAP_PULPO_TO_FIRELLI = true;
const TAG_NODES = true;

const PULPO_TO_FIRELLI_WEIGHT = {
  Light: 'Light',
  Regular: 'Regular',
  Medium: 'Medium',
  Bold: 'Bold',
};

const STYLES = [
  {
    name: 'Display/Banner',
    family: 'Giramisu VF',
    style: 'Straight Tight',
    size: 78,
    lineHeight: 74.1,
    letterSpacing: -1.56,
  },
  {
    name: 'Display/H1',
    family: 'Firelli Variable',
    style: 'Thin',
    size: 59,
    lineHeight: 61.95,
    letterSpacing: -0.59,
  },
  {
    name: 'Display/Section',
    family: 'Pulpo',
    style: 'Medium',
    size: 40,
    lineHeight: 44,
    letterSpacing: -0.4,
  },
  {
    name: 'Display/H2',
    family: 'Firelli Variable',
    style: 'Light',
    size: 37,
    lineHeight: 40.7,
    letterSpacing: -0.555,
  },
  {
    name: 'Display/H3',
    family: 'Pulpo',
    style: 'Medium',
    size: 28,
    lineHeight: 36,
    letterSpacing: -0.42,
  },
  {
    name: 'Display/Pullquote',
    family: 'Firelli Variable',
    style: 'Light Italic',
    size: 23,
    lineHeight: 29.9,
    letterSpacing: 0,
  },
  {
    name: 'Display/H4',
    family: 'Pulpo',
    style: 'Medium',
    size: 18,
    lineHeight: 23.4,
    letterSpacing: 0,
  },
  {
    name: 'Display/H4 Link',
    family: 'Pulpo',
    style: 'Regular',
    size: 18,
    lineHeight: 21.6,
    letterSpacing: 0,
    textDecoration: 'UNDERLINE',
  },
  {
    name: 'Display/Stat',
    family: 'Pulpo',
    style: 'Regular',
    size: 52,
    lineHeight: 52,
    letterSpacing: -1.04,
  },

  {
    name: 'Body/Standfirst',
    family: 'Shift',
    style: 'Medium',
    size: 17,
    lineHeight: 25.5,
    letterSpacing: 0,
  },
  {
    name: 'Body/Lead',
    family: 'Pulpo',
    style: 'Light',
    size: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  {
    name: 'Body/Paragraph',
    family: 'Shift',
    style: 'Light',
    size: 15,
    lineHeight: 24,
    letterSpacing: 0,
  },
  {
    name: 'Body/Paragraph Bold',
    family: 'Shift',
    style: 'Bold',
    size: 15,
    lineHeight: 24,
    letterSpacing: 0,
  },
  {
    name: 'Body/Paragraph Link',
    family: 'Shift',
    style: 'Light',
    size: 15,
    lineHeight: 24,
    letterSpacing: 0,
    textDecoration: 'UNDERLINE',
  },
  {
    name: 'Body/Small',
    family: 'Shift',
    style: 'Light',
    size: 14,
    lineHeight: 20.3,
    letterSpacing: 0,
  },

  {
    name: 'Caption/Eyebrow',
    family: 'Panel',
    style: 'Medium',
    size: 14,
    lineHeight: 22.4,
    letterSpacing: 1.12,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Eyebrow Bold',
    family: 'Panel',
    style: 'Bold',
    size: 14,
    lineHeight: 22.4,
    letterSpacing: 1.12,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Tag',
    family: 'Panel',
    style: 'Medium',
    size: 14,
    lineHeight: 18.2,
    letterSpacing: 1.12,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Number',
    family: 'Pulpo',
    style: 'Bold',
    size: 11,
    lineHeight: 17.6,
    letterSpacing: 0.88,
    textCase: 'UPPER',
  },
  {
    name: 'Caption/Small',
    family: 'Panel',
    style: 'Medium',
    size: 10,
    lineHeight: 16,
    letterSpacing: 0.8,
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
  if (await tryLoad(original))
    return { font: original, fellBack: REMAP_PULPO_TO_FIRELLI && spec.family === 'Pulpo' };
  return { font: null, fellBack: false };
}

function quantize(x) {
  return Math.round(x * 10) / 10;
}

function specMatchKey(spec) {
  return [
    spec.family,
    spec.style,
    quantize(spec.size),
    `${quantize(spec.lineHeight)}px`,
    `${quantize(spec.letterSpacing)}px`,
    spec.textCase || 'ORIGINAL',
    spec.textDecoration || 'NONE',
  ].join('|');
}

function nodeMatchKey(node) {
  const fn = node.fontName;
  if (typeof fn === 'symbol' || !fn || typeof fn !== 'object') return null;
  const size = node.fontSize;
  if (typeof size === 'symbol') return null;
  const lh = node.lineHeight;
  if (typeof lh === 'symbol' || !lh) return null;
  let lhStr;
  if (lh.unit === 'PIXELS') lhStr = `${quantize(lh.value)}px`;
  else if (lh.unit === 'AUTO') lhStr = 'AUTO';
  else return null;
  const ls = node.letterSpacing;
  if (typeof ls === 'symbol' || !ls) return null;
  let lsValue;
  if (ls.unit === 'PIXELS') lsValue = ls.value;
  else if (ls.unit === 'PERCENT') lsValue = (ls.value / 100) * size;
  else return null;
  const tc = typeof node.textCase === 'symbol' ? null : node.textCase;
  const td = typeof node.textDecoration === 'symbol' ? null : node.textDecoration;
  if (tc === null || td === null) return null;
  return [fn.family, fn.style, quantize(size), lhStr, `${quantize(lsValue)}px`, tc, td].join('|');
}

async function tagNodes(specToStyleId, fontsForStyles) {
  const keyToStyleId = new Map();
  for (const [spec, styleId] of specToStyleId) {
    keyToStyleId.set(specMatchKey(spec), styleId);
  }

  let linked = 0;
  const skippedAlreadyLinked = [];
  const skippedMixed = [];
  const unmatched = new Map();

  for (const page of figma.root.children) {
    await page.loadAsync();

    const stack = [page];
    while (stack.length) {
      const n = stack.pop();
      if ('children' in n) {
        for (const c of n.children) stack.push(c);
      }
      if (n.type !== 'TEXT') continue;
      if (typeof n.textStyleId === 'symbol') {
        skippedMixed.push({ id: n.id, reason: 'mixed style id' });
        continue;
      }
      if (n.textStyleId) {
        skippedAlreadyLinked.push(n.id);
        continue;
      }
      const key = nodeMatchKey(n);
      if (!key) {
        skippedMixed.push({
          id: n.id,
          sample: (n.characters || '').slice(0, 40),
          reason: 'mixed properties',
        });
        continue;
      }
      const styleId = keyToStyleId.get(key);
      if (!styleId) {
        const cur = unmatched.get(key) || {
          count: 0,
          sample: (n.characters || '').slice(0, 40),
          nodeId: n.id,
        };
        cur.count += 1;
        unmatched.set(key, cur);
        continue;
      }
      try {
        await n.setTextStyleIdAsync(styleId);
        linked += 1;
      } catch (e) {
        skippedMixed.push({
          id: n.id,
          reason: 'setTextStyleIdAsync failed: ' + (e && e.message ? e.message : String(e)),
        });
      }
    }
  }

  return { linked, skippedAlreadyLinked, skippedMixed, unmatched };
}

async function main() {
  const existing = await figma.getLocalTextStylesAsync();
  const existingByName = new Map(existing.map((s) => [s.name, s]));

  const created = [];
  const updated = [];
  const failed = [];
  const specToStyleId = [];

  for (const spec of STYLES) {
    const resolved = await resolveFont(spec);
    if (!resolved.font) {
      failed.push(`${spec.name}: no loadable font for ${spec.family} ${spec.style}`);
      continue;
    }
    const isNew = !existingByName.has(spec.name);
    const ts = isNew ? figma.createTextStyle() : existingByName.get(spec.name);
    if (isNew) ts.name = spec.name;
    ts.fontName = resolved.font;
    ts.fontSize = spec.size;
    ts.lineHeight = { value: spec.lineHeight, unit: 'PIXELS' };
    ts.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
    ts.textCase = spec.textCase || 'ORIGINAL';
    ts.textDecoration = spec.textDecoration || 'NONE';

    specToStyleId.push([spec, ts.id]);

    const note = resolved.fellBack ? ' (fell back to original family)' : '';
    const line = `${spec.name} -> ${resolved.font.family} ${resolved.font.style}${note}`;
    (isNew ? created : updated).push(line);
  }

  let tagReport = null;
  if (TAG_NODES) {
    tagReport = await tagNodes(specToStyleId);
  }

  const lines = [];
  lines.push(`Created ${created.length}:`);
  created.forEach((l) => lines.push('  + ' + l));
  if (updated.length) {
    lines.push('');
    lines.push(`Updated ${updated.length}:`);
    updated.forEach((l) => lines.push('  ~ ' + l));
  }
  if (failed.length) {
    lines.push('');
    lines.push(`Failed ${failed.length}:`);
    failed.forEach((l) => lines.push('  ! ' + l));
  }
  if (tagReport) {
    lines.push('');
    lines.push(`Tagged ${tagReport.linked} text nodes`);
    lines.push(`Skipped ${tagReport.skippedAlreadyLinked.length} already linked`);
    lines.push(`Skipped ${tagReport.skippedMixed.length} with mixed/unsupported properties`);
    if (tagReport.unmatched.size) {
      lines.push('');
      lines.push(`Unmatched ${tagReport.unmatched.size} property tuples (no style fits):`);
      for (const [key, info] of tagReport.unmatched) {
        lines.push(`  ? ${key}  x${info.count}  e.g. node ${info.nodeId} "${info.sample}"`);
      }
    }
  }
  const summary = lines.join('\n');
  console.log(summary);
  const tagSummary = tagReport ? `, ${tagReport.linked} nodes tagged` : '';
  figma.closePlugin(
    `${created.length} created, ${updated.length} updated, ${failed.length} failed${tagSummary}. See console.`
  );
}

main().catch((e) => {
  console.error(e);
  figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e)));
});
