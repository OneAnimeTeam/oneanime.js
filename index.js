#!/usr/bin/env node

const VERSION = '0.0.1';
const im = require('imagemagick');
const http = require('http');
const fs = require('fs');
const path = require('path');

const builtinFormat = {
    png: { mine: 'image/png', cvWebP: true, cvJPGP: true },
    jpg: { mine: 'image/jpeg', cvWebP: true, cvJPGP: true },
    jpeg: { mine: 'image/jpeg', cvWebP: true, cvJPGP: true },
    gif: { mine: 'image/gif', cvWebP: false, cvJPGP: false },
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
    logFunc(tmpText + text);
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
    printLog('info', `Template config file copied to\x1b[33m ${path.resolve(process.cwd(), 'config.json')}`);
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
        imgList[i] = { path: tmPath, list: tmpList };
        printLog('info', `Vaild: ${tmPath}`);
    }
});

http.createServer((req, res) => {
    const targetPath = req.url.slice(1);
    printLog('info', `User requested\x1b[33m ${targetPath}\x1b[0m`);
    if (typeof imgList[targetPath] === 'undefined') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(errorPage('404 Not Found'));
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(targetPath);
}).listen(config.serverPort, config.serverAddress);
printLog('info', `Server started at\x1b[33m ${config.serverAddress}:${config.serverPort}\x1b[0m`);

process.on('SIGINT', () => {
    printLog('info', 'Interrupted');
    process.exit(2);
});
