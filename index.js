#!/usr/bin/env node

const VERSION = require('./package.json').version;
const childProcess = require('child_process');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');
const log4js = require('log4js');

const logger = log4js.getLogger('OneAnime');
const cacheDirName = '.oneanime';
const builtinFormat = {
    png: { mime: 'image/png', cvWebP: true, cvJPGP: true },
    jpg: { mime: 'image/jpeg', cvWebP: true, cvJPGP: true },
    jpeg: { mime: 'image/jpeg', cvWebP: true, cvJPGP: true },
    gif: { mime: 'image/gif', cvWebP: false, cvJPGP: false },
    webp: { mime: 'image/webp', cvWebP: false, cvJPGP: true },
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

const errorPage = status => `<html><head>
<title>${status}</title>
</head>
<body bgcolor="white">
<center><h1>${status}</h1></center>
<hr><center>OneAnimeJS/${VERSION}</center>
</body></html>`;

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
        path.resolve(__dirname, 'config.example.json'),
        path.resolve(process.cwd(), configFileName),
    );
    logger.info(`Template config file copied to \x1b[33m${path.resolve(process.cwd(), configFileName)}`);
    process.exit(0);
}

const configPath = path.resolve(process.cwd(), process.argv[2]);
const config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
const masterPath = path.resolve(path.parse(configPath).dir, config.path);

logger.info('Scanning master directory');
const masterList = fs.readdirSync(masterPath);
const imgList = {};

masterList.forEach((i) => {
    const tmPath = path.resolve(masterPath, i);
    const tmp = fetchDirList(tmPath);
    if (tmp) {
        const tmpList = tmp.filter(isFileNameVaild);
        if (tmpList.length <= 1) {
            logger.warn(`Invaild: ${tmPath}, with less than 2 images`);
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

const serverHandler = (req, res) => {
    console.time('serve');
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
            const usedImageExt = path.parse(usedImage).ext.slice(1).toLowerCase();
            const fullFileName = path.resolve(usedGroup.path, usedImage);
            logger.info(`Server selected \x1b[33m${fullFileName}`);
            if (webpSupport && config.enableWebP && builtinFormat[usedImageExt].cvWebP) {
                const finalPath = path.resolve(usedGroup.path, `${cacheDirName}/${usedImage}.webp`);
                if (fs.existsSync(finalPath)) {
                    logger.info(`Use cached file \x1b[33m${finalPath}`);
                } else {
                    childProcess.spawnSync('convert', [fullFileName, finalPath]);
                    logger.info(`Converted \x1b[33m${fullFileName}\x1b[0m to WebP format`);
                }
                res.writeHead(200, { 'Content-Type': 'image/webp' });
                res.end(fs.readFileSync(finalPath));
            } else if ((config.enableJPGProgressiveConvert && builtinFormat[usedImageExt].cvJPGP) || usedImageExt === 'webp') {
                const finalPath = path.resolve(usedGroup.path, `${cacheDirName}/${usedImage}.jpg`);
                if (fs.existsSync(finalPath)) {
                    logger.info(`Use cached file \x1b[33m${finalPath}`);
                } else {
                    childProcess.spawnSync('convert', [fullFileName, '-interlace', 'Plane', finalPath]);
                    logger.info(`Converted \x1b[33m${fullFileName}\x1b[0m to JPEG Progressive format`);
                }
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(fs.readFileSync(finalPath));
            } else {
                res.writeHead(200, { 'Content-Type': builtinFormat[path.parse(fullFileName).ext.slice(1).toLowerCase()].mime });
                res.end(fs.readFileSync(fullFileName));
            }
        } catch (e) {
            logger.error(e);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(errorPage('500 Internal Server Error'));
            return false;
        }
    }
    console.timeEnd('serve');
    return true;
};

http.createServer(serverHandler).listen(config.serverPort, config.serverAddress);

logger.info(`Server started at\x1b[33m ${config.serverAddress}:${config.serverPort}`);

process.on('SIGINT', () => {
    logger.info('Interrupted');
    process.exit(2);
});
