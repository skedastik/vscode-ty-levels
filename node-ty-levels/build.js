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
    sourcemap: true,
    external: [
        'mathjs'
    ]
}).catch(() => process.exit(1));
