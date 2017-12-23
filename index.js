#!/usr/bin/env node

const VERSION = '1.0.0';
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
    webp: { mime: 'image/webp', cvWebP: false, cvJPGP: true },
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
    const ext = path.parse(name).ext.slice(1).toLowerCase();
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

// 针对早期 Node.js 版本的 Polyfill

if (typeof fs.copyFileSync === 'undefined') {
    fs.copyFileSync = (from, to) => {
        fs.createReadStream(from).pipe(fs.createWriteStream(to));
        return to;
    };
}

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
    printLog('info', `Template config file copied to \x1b[33m${path.resolve(process.cwd(), configFileName)}`);
    process.exit(0);
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

if (Object.keys(imgList).length === 0) {
    printLog('error', 'No vaild image directory');
    process.exit(1);
}

http.createServer((req, res) => {
    const targetPath = req.url.slice(1);
    const webpSupport = req.headers.accept.indexOf('image/webp') !== -1;
    printLog('info', `User ${webpSupport ? '(WebP supported) ' : ''}requested \x1b[33m${targetPath}`);
    if (typeof imgList[targetPath] === 'undefined') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(errorPage('404 Not Found'));
    } else {
        const usedGroup = imgList[targetPath];
        const selectedID = Math.floor(Math.random() * usedGroup.list.length);
        const usedImage = usedGroup.list[selectedID];
        const usedImageExt = path.parse(usedImage).ext.slice(1).toLowerCase();
        const fullFileName = path.resolve(usedGroup.path, usedImage);
        printLog('info', `Server selected \x1b[33m${fullFileName}`);
        if (webpSupport && config.enableWebP && builtinFormat[usedImageExt].cvWebP) {
            const finalPath = path.resolve(usedGroup.path, `${cacheDirName}/${usedImage}.webp`);
            if (fs.existsSync(finalPath)) {
                printLog('info', `Use cached file \x1b[33m${finalPath}`);
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
            res.end(fs.readFileSync(decodeURIComponent(finalPath)));
        } else if ((config.enableJPGProgressiveConvert && builtinFormat[usedImageExt].cvJPGP) || usedImageExt === 'webp') {
            const finalPath = path.resolve(usedGroup.path, `${cacheDirName}/${usedImage}.jpg`);
            if (fs.existsSync(finalPath)) {
                printLog('info', `Use cached file \x1b[33m${finalPath}`);
            } else {
                try {
                    childProcess.spawnSync('convert', [fullFileName, '-interlace', 'Plane', finalPath]);
                    printLog('info', `Converted \x1b[33m${fullFileName}\x1b[0m to JPEG Progressive format`);
                } catch (e) {
                    printLog('error', e);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(errorPage('500 Internal Server Error'));
                    return false;
                }
            }
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(fs.readFileSync(decodeURIComponent(finalPath)));
        } else {
            res.writeHead(200, { 'Content-Type': builtinFormat[path.parse(fullFileName).ext.slice(1).toLowerCase()].mime });
            res.end(fs.readFileSync(decodeURIComponent(fullFileName)));
        }
    }
    return true;
}).listen(config.serverPort, config.serverAddress);
printLog('info', `Server started at\x1b[33m ${config.serverAddress}:${config.serverPort}`);

process.on('SIGINT', () => {
    printLog('info', 'Interrupted');
    process.exit(2);
});
