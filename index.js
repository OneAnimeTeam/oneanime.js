#!/usr/bin/env node

const imagemagick = require('imagemagick');
const http = require('http');
const fs = require('fs');
const path = require('path');

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
const imgList = [];

masterList.forEach((i) => {
    const tmPath = path.resolve(masterPath, i);
    const tmp = fetchDirList(tmPath);
    if (tmp) {
        imgList.push({ name: i, path: tmPath, list: tmp });
        printLog('info', `Vaild: ${tmPath}`);
    }
});

http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('test');
    }
}).listen(config.serverPort, config.serverAddress);
printLog('info', `Server started at \x1b[33m${config.serverAddress}:${config.serverPort}\x1b[0m`);
