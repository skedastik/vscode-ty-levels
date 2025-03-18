// build.js
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: [
        'index.ts'
    ],
    outfile: 'dist/bundle.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    minify: true,
    sourcemap: true
}).catch(() => process.exit(1));
