# OneAnime.js

OneAnime 是一个随机图片服务器，最初目的是为了让访问者看到不一样的博客头图。本版本是 OneAnime 的 Node.js 实现，使用了 ES6 标准编写。

## 为什么使用 OneAnime ##

* 将图片格式转换为 `.webp` 格式，节约带宽以及您的磁盘空间。如果不需要，你也可以在配置文件中关闭这些功能。
* 单文件设计，更小巧和轻便。
* 只需简单配置即可使用。

## 安装 ##

```bash
npm install -g git+https://github.com/tcdw/oneanime.js
```

## 配置 ##

你需要使用 `oneanime init` 命令来获取一个配置文件。

```json
{
    "path": ".",
    "serverAddress": "0.0.0.0",
    "serverPort": 8086,
    "enableWebP": true,
    "enableJPGProgressiveConvert": true
}
```

* `path`：图片集所在的路径
* `serverAddress`：服务器监听的 IP 地址。请注意，0.0.0.0 会导致 OneAnime.js 服务器可直接在外网被访问。
* `serverPort`
* `enableWebP`
* `enableJPGProgressiveConvert`

您可以将图片放在您指定的目录下，只需要在请求时访问正确的地址。例如，如果您将图片放在 image/photos 目录下，那么直接请求 /photos 即可。

配置完成后，启动您的解释器即可启动 OneAnime 服务器：