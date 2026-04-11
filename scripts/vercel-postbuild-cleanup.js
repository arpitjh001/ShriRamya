#!/usr/bin/env node
// No-op postbuild cleanup for Vercel deployments.
// Some deployments reference this script; provide a harmless placeholder
// to avoid build failures when the file is missing.
try {
  // Intentionally empty — satisfied the expected script hook.
  console.log('vercel-postbuild-cleanup: noop');
} catch (err) {
  // Do not fail the build if anything unexpected happens here.
  console.error('vercel-postbuild-cleanup error (ignored):', err && err.message);
  process.exit(0);
}
