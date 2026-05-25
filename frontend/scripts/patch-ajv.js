/**
 * patch-ajv.js — robust postinstall patch for react-scripts@5 + ajv@8 compatibility.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

console.log('[patch-ajv] Starting patch process...');

try {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('[patch-ajv] node_modules not found at', nodeModulesPath);
    process.exit(0);
  }

  // Find all _formatLimit.js files in ajv-keywords packages
  const allFiles = getAllFiles(nodeModulesPath);
  const targetFiles = allFiles.filter(f => 
    f.endsWith('_formatLimit.js') && 
    f.includes('ajv-keywords') && 
    !f.includes('dotjs')
  );

  console.log(`[patch-ajv] Found ${targetFiles.length} files to check.`);

  targetFiles.forEach(f => {
    try {
      const content = fs.readFileSync(f, 'utf8');
      
      // Look for the problematic line. 
      // In ajv-keywords 3.x, it's usually 'var formats = ajv._formats;'
      // We want to change it to 'var formats = ajv._formats || {};'
      
      if (content.includes('var formats = ajv._formats;') && !content.includes('var formats = ajv._formats || {};')) {
        const patched = content.replace(
          'var formats = ajv._formats;',
          'var formats = ajv._formats || {};'
        );
        fs.writeFileSync(f, patched);
        console.log('[patch-ajv] Patched:', f);
      } else if (content.includes('var formats = ajv._formats || {};')) {
        console.log('[patch-ajv] Already patched:', f);
      } else {
        // Check for other variants or if it's already using a safer pattern
        console.log('[patch-ajv] Skipping (no match):', f);
      }
    } catch (e) {
      console.error(`[patch-ajv] Error processing ${f}:`, e.message);
    }
  });

  console.log('[patch-ajv] Patch process completed.');
} catch (e) {
  console.error('[patch-ajv] Critical error:', e.message);
}
