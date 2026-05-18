import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const nodeModulesPath = join(root, 'node_modules');
const pnpmStorePath = join(nodeModulesPath, '.pnpm');
const shouldFix = process.argv.includes('--fix');

function readPackageVersion(packageName) {
  const packagePath = join(nodeModulesPath, packageName, 'package.json');

  if (!existsSync(packagePath)) {
    return null;
  }

  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  return packageJson.version ?? null;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const prismaVersion = readPackageVersion('prisma');
const clientVersion = readPackageVersion('@prisma/client');
const hasPnpmStore = existsSync(pnpmStorePath);
const generatorBuildPath = join(nodeModulesPath, '@prisma', 'client', 'generator-build', 'index.js');
const generatorBuildSource = existsSync(generatorBuildPath) ? readFileSync(generatorBuildPath, 'utf8') : '';
const generatorNeedsWasm = generatorBuildSource.includes('prisma_schema_build_bg.wasm');
const hasGeneratorWasm = existsSync(join(nodeModulesPath, '@prisma', 'client', 'generator-build', 'prisma_schema_build_bg.wasm'));

console.log('Prisma dependency diagnostics:');
console.log(`- prisma: ${prismaVersion ?? 'not installed'}`);
console.log(`- @prisma/client: ${clientVersion ?? 'not installed'}`);
console.log(`- node_modules/.pnpm present: ${hasPnpmStore ? 'yes' : 'no'}`);
console.log(`- Prisma generator expects WASM: ${generatorNeedsWasm ? 'yes' : 'no'}`);
console.log(`- Prisma generator WASM present: ${hasGeneratorWasm ? 'yes' : 'no'}`);

const hasMismatch = prismaVersion !== null && clientVersion !== null && prismaVersion !== clientVersion;
const needsRepair = hasMismatch || hasPnpmStore || (generatorNeedsWasm && !hasGeneratorWasm);

if (!needsRepair) {
  console.log('No local Prisma dependency issue was detected.');
  process.exit(0);
}

console.log('\nA clean npm install is recommended for this repository.');

if (!shouldFix) {
  console.log('Run `npm run prisma:repair -- --fix` to remove node_modules, reinstall from package-lock.json, and regenerate Prisma Client.');
  process.exit(1);
}

console.log('\nRemoving node_modules...');
rmSync(nodeModulesPath, { recursive: true, force: true });

console.log('\nInstalling dependencies from package-lock.json...');
run('npm', ['ci']);

console.log('\nRegenerating Prisma Client...');
run('npm', ['run', 'prisma:generate']);
