/**
 * Genera el bundle de producción del React y lo copia a lumina-api/build
 * (y opcionalmente a lumina-api/public para el document root de Plesk).
 *
 * Uso (desde lumina-api):
 *   npm run deploy:bundle
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiRoot = path.join(__dirname, '..');
const reactRoot = path.join(apiRoot, '..', 'lumina-app-react');
const buildSrc = path.join(reactRoot, 'build');
const buildDest = path.join(apiRoot, 'build');
const publicDest = path.join(apiRoot, 'public');

function rmDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
        const from = path.join(src, name);
        const to = path.join(dest, name);
        if (fs.statSync(from).isDirectory()) {
            copyDir(from, to);
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

if (!fs.existsSync(path.join(reactRoot, 'package.json'))) {
    console.error('No se encuentra lumina-app-react en:', reactRoot);
    process.exit(1);
}

console.log('▶ npm run build (lumina-app-react)...');
execSync('npm run build', { cwd: reactRoot, stdio: 'inherit' });

if (!fs.existsSync(path.join(buildSrc, 'index.html'))) {
    console.error('Build fallido: no hay index.html en', buildSrc);
    process.exit(1);
}

console.log('▶ Copiando a lumina-api/build ...');
rmDir(buildDest);
copyDir(buildSrc, buildDest);

console.log('▶ Copiando a lumina-api/public (document root Plesk) ...');
rmDir(publicDest);
copyDir(buildSrc, publicDest);

console.log('\n✅ Listo. Sube lumina-api/ a Plesk (puedes reemplazar lo anterior; sin node_modules).');
console.log('   Plesk: index.js, NODE_ENV=production');
console.log('   Servidor: npm install && npx prisma generate && npx prisma db push && node seed-demo-data.js');
