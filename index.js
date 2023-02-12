#!/usr/bin/env node

import * as http from 'http';
import * as path from 'path';
import { fileURLToPath, URL } from 'url';
import fs from 'fs-extra';
import log4js from 'log4js';
import gm from 'gm';

const VERSION = fs.readJSONSync(fileURLToPath(new URL("./package.json", import.meta.url)), { encoding: 'utf8' }).version;

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
 * @returns {array} 文件列表
 */

const fetchDirList = (dirName) => {
    let list;
    try {
        list = fs.readdirSync(dirName);
        if (list === null) {
            return false;
        }
        return list;
    } catch (e) {
        return false;
    }
};

/**
 * 从扩展名检查文件是否合法
 * @param {string} name - 文件名
 * @returns {boolean} 是否合法
 */

const isFileNameVaild = (name) => {
    const ext = path.parse(name).ext.slice(1).toLowerCase();
    if (Object.keys(builtinFormat).indexOf(ext) !== -1) {
        return true;
    }
    return false;
};

/**
 * 获取错误页 HTML
 * @param {string} status - 错误信息
 * @returns {string} 错误页 HTML
 */

const errorPage = (status) => `<html>
<head>
    <title>${status}</title>
</head>
<body>
    <center><h1>${status}</h1></center>
    <hr>
    <center>OneAnimeJS/${VERSION}</center>
</body>
</html>`;

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
        fileURLToPath(new URL("./config.example.json", import.meta.url)),
        path.resolve(process.cwd(), configFileName),
    );
    logger.info(`Template config file copied to \x1b[33m${path.resolve(process.cwd(), configFileName)}`);
    process.exit(0);
}

const configPath = path.resolve(process.cwd(), process.argv[2]);
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
        const tmpList = tmp.filter(isFileNameVaild);
        if (tmpList.length < 1) {
            logger.warn(`Invaild: ${tmPath}, with less than 1 images`);
            return false;
        }
        imgList[i] = { path: tmPath, list: tmpList };
        fs.mkdirpSync(path.resolve(tmPath, cacheDirName));
        logger.info(`Vaild: ${tmPath}, ${tmpList.length} images found`);
    }
    return true;
});

if (Object.keys(imgList).length === 0) {
    logger.error('No vaild image directory');
    process.exit(1);
}

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
        res.end(errorPage('404 Not Found'));
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
            res.end(errorPage('500 Internal Server Error'));
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
