import esbuild from 'esbuild';


esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  minify: true,
  platform: 'node',
  sourcemap: true,
  target: 'node18',
  plugins: [],
}).catch(() => process.exit(1));
