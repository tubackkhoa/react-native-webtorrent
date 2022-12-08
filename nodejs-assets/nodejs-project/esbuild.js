require('esbuild')
    .build({
        entryPoints: ['main.ts'],
        bundle: true,
        target: 'node10.4',
        outfile: 'main.js',
        platform: 'node',
        external: ['rn-bridge'],
    })
    .catch(() => process.exit(1));
