#!/usr/bin/env node

const VERSION = '0.0.1';
const cacheDirName = '.oneanime';
const childProcess = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const builtinFormat = {
    png: { mime: 'image/png', cvWebP: true, cvJPGP: true },
    jpg: { mime: 'image/jpeg', cvWebP: true, cvJPGP: true },
    jpeg: { mime: 'image/jpeg', cvWebP: true, cvJPGP: true },
    gif: { mime: 'image/gif', cvWebP: false, cvJPGP: false },
};

/**
 * 向终端发送一行日志内容
 * @param {string} level - 日志级别，可以是 info、warn、error
 * @param {string} text - 日志文本
 */

const printLog = (level, text) => {
    let tmpText = '';
    let logFunc;
    switch (level) {
    case 'info':
        logFunc = console.log;
        tmpText += '\x1b[36m[INFO]\x1b[0m ';
        break;
    case 'warn':
        logFunc = console.warn;
        tmpText += '\x1b[33m[WARN]\x1b[0m ';
        break;
    case 'error':
        logFunc = console.error;
        tmpText += '\x1b[31m[ERROR]\x1b[0m ';
        break;
    default:
        return false;
    }
    logFunc(`${tmpText + text}\x1b[0m`);
    return true;
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
            return false;
        }
        return list;
    } catch (e) {
        return false;
    }
};

/**
 * 如果没有某文件夹则新建这个文件夹
 * @param {string} name - 文件夹名
 */

const mkdir = (name) => {
    try {
        fs.readdirSync(name);
    } catch (e) {
        fs.mkdirSync(name);
    }
    return name;
};

/**
 * 从扩展名检查文件是否合法
 * @param {string} name - 文件名
 */

const isFileNameVaild = (name) => {
    const ext = path.parse(name).ext.slice(1);
    if (Object.keys(builtinFormat).indexOf(ext) !== -1) {
        return true;
    }
    return false;
};

/**
 * 获取错误页 HTML
 * @param {string} status - 错误信息
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
    fs.copyFileSync(
        path.resolve(__dirname, 'config.example.json'),
        path.resolve(process.cwd(), 'config.json'),
    );
    printLog('info', `Template config file copied to \x1b[33m${path.resolve(process.cwd(), 'config.json')}`);
    process.exit(1);
}
const configPath = path.resolve(process.cwd(), process.argv[2]);
const config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
const masterPath = path.resolve(path.parse(configPath).dir, config.path);

printLog('info', 'Scanning master directory');
const masterList = fs.readdirSync(masterPath);
const imgList = {};

masterList.forEach((i) => {
    const tmPath = path.resolve(masterPath, i);
    const tmp = fetchDirList(tmPath);
    if (tmp) {
        const tmpList = tmp.filter(isFileNameVaild);
        if (tmpList.length <= 1) {
            printLog('warn', `Invaild: ${tmPath}, with less than 2 images`);
            return false;
        }
        imgList[i] = { path: tmPath, list: tmpList };
        mkdir(path.resolve(tmPath, cacheDirName));
        printLog('info', `Vaild: ${tmPath}, ${tmpList.length} images found`);
    }
    return true;
});

http.createServer((req, res) => {
    const targetPath = req.url.slice(1);
    printLog('info', `User requested \x1b[33m${targetPath}`);
    if (typeof imgList[targetPath] === 'undefined') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(errorPage('404 Not Found'));
    } else {
        const webpSupport = req.headers.accept.indexOf('image/webp') !== -1;
        const usedGroup = imgList[targetPath];
        const selectedID = Math.floor(Math.random() * usedGroup.list.length);
        const usedImage = usedGroup.list[selectedID];
        const fullFileName = path.resolve(usedGroup.path, usedImage);
        printLog('info', `Server selected \x1b[33m${fullFileName}`);
        if (webpSupport && config.enableWebP) {
            const finalPath = path.resolve(usedGroup.path, `${cacheDirName}/${usedImage}.webp`);
            if (!fs.existsSync(finalPath)) {
                printLog('info', `Use cache \x1b[33m${fullFileName}`);
            } else {
                try {
                    childProcess.spawnSync('convert', [fullFileName, finalPath]);
                    printLog('info', `Converted \x1b[33m${fullFileName}\x1b[0m to WebP format`);
                } catch (e) {
                    printLog('error', e);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(errorPage('500 Internal Server Error'));
                    return false;
                }
            }
            res.writeHead(200, { 'Content-Type': 'image/webp' });
            res.end(fs.readFileSync(finalPath));
        } else {
            res.writeHead(200, { 'Content-Type': builtinFormat[path.parse(fullFileName).ext.slice(1)].mime });
            res.end(fs.readFileSync(fullFileName));
        }
    }
}).listen(config.serverPort, config.serverAddress);
printLog('info', `Server started at\x1b[33m ${config.serverAddress}:${config.serverPort}`);

process.on('SIGINT', () => {
    printLog('info', 'Interrupted');
    process.exit(2);
});
