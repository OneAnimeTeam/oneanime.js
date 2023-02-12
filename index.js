#!/usr/bin/env node

import * as http from 'http';
import * as path from 'path';
import { fileURLToPath, URL } from 'url';
import fs from 'fs-extra';
import log4js from 'log4js';
import gm from 'gm';

/* const VERSION = fs.readJSONSync(
    fileURLToPath(new URL('./package.json', import.meta.url)),
    { encoding: 'utf8' },
).version; */

const logger = log4js.getLogger('OneAnime');
logger.level = 'info';
const cacheDirName = '.oneanime';
const builtinFormat = {
    png: { mime: 'image/png', cvWebP: true },
    jpg: { mime: 'image/jpeg', cvWebP: true },
    jpeg: { mime: 'image/jpeg', cvWebP: true },
    gif: { mime: 'image/gif', cvWebP: false },
    webp: { mime: 'image/webp', cvWebP: false },
};

/**
 * 获取文件列表（通用版）
 * @param {string} dirName - 文件夹名称
 */

const fetchDirList = (dirName) => {
    let list;
    try {
        list = fs.readdirSync(dirName);
        if (list === null) {
            return null;
        }
        return list;
    } catch (e) {
        return null;
    }
};

/**
 * 从扩展名检查文件是否合法
 * @param {string} name - 文件名
 * @returns {boolean} 是否合法
 */

const isFileNameValid = (name) => {
    const ext = path.parse(name).ext.slice(1).toLowerCase();
    return Object.keys(builtinFormat).includes(ext);
};

if (typeof process.argv[2] === 'undefined') {
    console.error('Usage: oneanime config_file');
    console.error('Want a new config file? Run `oneanime init`');
    process.exit(1);
}

if (process.argv[2] === 'init') {
    let configFileName = 'config.json';
    if (fs.existsSync('config.json')) {
        let d = 0;
        while (fs.existsSync(`config.${d}.json`)) {
            d += 1;
        }
        configFileName = `config.${d}.json`;
    }
    fs.copyFileSync(
        fileURLToPath(new URL('./config.example.json', import.meta.url)),
        path.resolve(process.cwd(), configFileName),
    );
    logger.info(`Template config file copied to \x1b[33m${path.resolve(process.cwd(), configFileName)}`);
    process.exit(0);
}

const configPath = path.resolve(process.cwd(), process.argv[2]);
/**
 * @type {{
 * path: string,
 * serverAddress: string,
 * serverPort: number,
 * enableWebP: boolean,
 * useImageMagick: boolean
 * }}
 */
const config = fs.readJSONSync(configPath, { encoding: 'utf8' });
const masterPath = path.resolve(path.parse(configPath).dir, config.path);
let handler = gm;
if (config.useImageMagick) {
    handler = gm.subClass({ imageMagick: true });
}

logger.info('Scanning master directory');
const masterList = fs.readdirSync(masterPath);
const imgList = {};

masterList.forEach((i) => {
    const tmPath = path.resolve(masterPath, i);
    const tmp = fetchDirList(tmPath);
    if (tmp) {
        const tmpList = tmp.filter(isFileNameValid);
        if (tmpList.length < 1) {
            logger.warn(`Invalid: ${tmPath}, with less than 1 images`);
            return false;
        }
        imgList[i] = { path: tmPath, list: tmpList };
        fs.mkdirpSync(path.resolve(tmPath, cacheDirName));
        logger.info(`Valid: ${tmPath}, ${tmpList.length} images found`);
    }
    return true;
});

if (Object.keys(imgList).length === 0) {
    logger.error('No valid image directory');
    process.exit(1);
}

/**
 *
 * @param from
 * @param to
 * @return {Promise<string>}
 */
const imageHandler = (from, to) => new Promise((resolve, reject) => {
    const usedImageExt = path.parse(from).ext.slice(1).toLowerCase();
    if (config.enableWebP && builtinFormat[usedImageExt].cvWebP) {
        if (fs.existsSync(to)) {
            logger.info(`Use cached file \x1b[33m${to}`);
            resolve(to);
        } else {
            handler(from).write(`${to}.webp`, (e) => {
                if (e) {
                    reject(e);
                    return false;
                }
                logger.info(`Converted \x1b[33m${from}\x1b[0m to WebP format`);
                resolve(`${to}.webp`);
                return true;
            });
        }
    } else {
        resolve(to);
    }
});

const serverHandler = async (req, res) => {
    const targetPath = decodeURIComponent(req.url.slice(1));
    const webpSupport = req.headers.accept.indexOf('image/webp') !== -1;
    logger.info(`User ${webpSupport ? '(WebP supported) ' : ''}requested \x1b[33m${targetPath}`);
    if (typeof imgList[targetPath] === 'undefined') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end();
    } else {
        try {
            const usedGroup = imgList[targetPath];
            const selectedID = Math.floor(Math.random() * usedGroup.list.length);
            const usedImage = usedGroup.list[selectedID];
            const fullPath = path.resolve(usedGroup.path, usedImage);
            const finalPath = path.resolve(usedGroup.path, `${cacheDirName}/${usedImage}`);
            logger.info(`Server selected \x1b[33m${fullPath}`);

            const resultPath = await imageHandler(fullPath, finalPath);
            const resultExt = path.parse(resultPath).ext.slice(1).toLowerCase();

            res.writeHead(200, { 'Content-Type': builtinFormat[resultExt] });
            res.end(fs.readFileSync(resultPath));
        } catch (e) {
            logger.error(e);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end();
            return false;
        }
    }
    return true;
};

http.createServer(serverHandler).listen(config.serverPort, config.serverAddress);

logger.info(`Server started at\x1b[33m ${config.serverAddress}:${config.serverPort}`);

process.on('SIGINT', () => {
    logger.info('Interrupted');
    process.exit(2);
});
