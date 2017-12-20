#!/usr/bin/env node

const imagemagick = require('imagemagick');
const http = require('http');
const fs = require('fs');
const path = require('path');

const logColor = {
    black: 0,
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    white: 7,
};

/**
 * 向终端发送一行日志内容
 * @param {string} level - 日志级别，可以是 info、warn、error
 * @param {string} text - 日志文本
 * @param {number} [textColor] - 输出到终端的文字颜色
 * @param {number} [bgColor] - 输出到终端的背景颜色
 */

const printLog = (level, text, textColor = -1, bgColor = -1) => {
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
    if (textColor >= 0) {
        tmpText += `\x1b[3${textColor}m`;
    }
    if (bgColor >= 0) {
        tmpText += `\x1b[4${textColor}m`;
    }
    logFunc(tmpText + text);
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
    printLog('info', '这是一条提示消息！');
    printLog('warn', '这是一条警告消息！');
    printLog('error', '这是一条错误消息！');
    printLog('info', `Template config file copied to\x1b[3${logColor.yellow}m ${path.resolve(process.cwd(), 'config.json')}`);
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(process.argv[2], { encoding: 'utf8' }));

http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('test');
    }
}).listen(config.serverPort, config.serverAddress);
