#!/usr/bin/env node

const imagemagick = require('imagemagick');
const http = require('http');
const fs = require('fs');

if (typeof process.argv[2] === 'undefined') {
    console.error('Usage: oneanime config_file');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(process.argv[2], { encoding: 'utf8' }));


http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('test');
    }
}).listen(8080, 'localhost');
