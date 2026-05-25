/**
 * patch-ajv.js — postinstall patch for react-scripts@5 + ajv@8 compatibility.
 *
 * react-scripts@5 bundles webpack loaders (babel-loader, file-loader,
 * fork-ts-checker-webpack-plugin) that each carry their own nested
 * ajv-keywords@3.x. That version's _formatLimit.js reads `ajv._formats`
 * which is undefined in ajv@8, causing a TypeError at webpack startup.
 *
 * Fix: guard the assignment so missing _formats defaults to {}.
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const raw = execSync(
    "find node_modules -name '_formatLimit.js' -not -path '*/dotjs/*' 2>/dev/null"
  ).toString().trim();

  const files = raw.split('\n').filter(Boolean);

  files.forEach(f => {
    try {
      const content = fs.readFileSync(f, 'utf8');
      if (!content.includes('var formats = ajv._formats;')) return; // already patched or different version
      const patched = content.replace(
        'var formats = ajv._formats;',
        'var formats = ajv._formats || {};'
      );
      fs.writeFileSync(f, patched);
      console.log('[patch-ajv] patched', f);
    } catch (e) {
      // Non-fatal — missing one file doesn't break others
    }
  });
} catch (e) {
  // find not available or no node_modules yet — skip silently
}
