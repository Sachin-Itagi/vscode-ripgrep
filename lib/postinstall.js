// @ts-check
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const util = require('util');
const child_process = require('child_process');

const download = require('./download');

const fsExists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const exec = util.promisify(child_process.exec);

const forceInstall = process.argv.includes('--force');
if (forceInstall) {
    console.log('--force, ignoring caches');
}

const VERSION = 'v13.0.0-10';
const ARM32_LINUX_VERSION = 'v13.0.0-4';// use this for arm-unknown-linux-gnueabihf until we can fix https://github.com/microsoft/ripgrep-prebuilt/issues/24
const BIN_PATH = path.join(__dirname, '../bin');

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection: ', promise, 'reason:', reason);
});

async function getTarget() {
    const arch = process.env.npm_config_arch || os.arch();

    switch (os.platform()) {
        case 'darwin':
            return arch === 'arm64' ? 'aarch64-apple-darwin' :
                'x86_64-apple-darwin';
        case 'win32':
            return arch === 'x64' ? 'x86_64-pc-windows-msvc' :
                arch === 'arm' ? 'aarch64-pc-windows-msvc' :
                'i686-pc-windows-msvc';
        case 'linux':
            return arch === 'x64' ? 'x86_64-unknown-linux-musl' :
                arch === 'arm' ? 'arm-unknown-linux-gnueabihf' :
                arch === 'armv7l' ? 'arm-unknown-linux-gnueabihf' :
                arch === 'arm64' ? 'aarch64-unknown-linux-musl':
                arch === 'ppc64' ? 'powerpc64le-unknown-linux-gnu' :
                arch === 's390x' ? 's390x-unknown-linux-gnu' :
                    'i686-unknown-linux-musl'
        default: throw new Error('Unknown platform: ' + os.platform());
    }
}

async function main() {
    const binExists = await fsExists(BIN_PATH);
    if (!forceInstall && binExists) {
        console.log('bin/ folder already exists, exiting');
        process.exit(0);
    }

    if (!binExists) {
        await mkdir(BIN_PATH);
    }

    const target = await getTarget();
    const opts = {
        version: target === "arm-unknown-linux-gnueabihf" ? ARM32_LINUX_VERSION: VERSION,
        token: process.env['GITHUB_TOKEN'],
        target: await getTarget(),
        destDir: BIN_PATH,
        force: forceInstall
    };
    try {
        await download(opts);
    } catch (err) {
        console.error(`Downloading ripgrep failed: ${err.stack}`);
        process.exit(1);
    }
}

main();
