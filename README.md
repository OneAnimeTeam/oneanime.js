# OneAnime.js

OneAnime 是一个随机图片服务器，最初目的是为了让访问者看到不一样的博客头图。本项目是前辈 [qwe7002](https://qwe7002.com) 的项目 [OneAnime](https://github.com/qwe7002/OneAnime) 的 JavaScript 复刻版本，使用了 ES6 标准编写。

## 为什么使用 OneAnime ##

* 将图片格式转换为 `.webp` 格式，节约带宽以及您的磁盘空间。如果不需要，你也可以在配置文件中关闭这些功能。
* 只需简单配置即可使用。

## 安装 / 更新 ##

```bash
npm install -g git+https://github.com/tcdw/oneanime.js
```

## 配置 ##

你需要使用 `oneanime init` 命令来获取一个配置文件到你命令行的当前工作路径 (`$PWD`)。

```json
{
    "path": ".",
    "serverAddress": "0.0.0.0",
    "serverPort": 8086,
    "enableWebP": true,
    "enableJPGProgressiveConvert": true
}
```

* `path`：图片集所在的路径，可以与配置文件所在路径相对
* `serverAddress`：服务器监听的 IP 地址。请注意，0.0.0.0 会导致 OneAnime.js 服务器可直接在外网被访问
* `serverPort`：服务器所监听的端口
* `enableWebP`：是否启用 WebP 转换
* `enableJPGProgressiveConvert`：是否启用渐进式 JPEG 转换（针对不支持 WebP 的浏览器，如 IE 与 FireFox）。但是，如果请求到了 `.webp` 图片，则仍会针对这些浏览器转换渐进式 JPEG。

您可以将图片集放在您指定的目录（`path`）下，只需要在请求时访问正确的地址。例如，如果您将图片放在 `image/photos` 目录下，那么直接请求 `/photos` 即可。**每个图片文件夹至少需要有两张有效图片，否则会被直接忽略。**

接受的图片类型：`jpg`、`jpeg`、`gif`，`png`，`webp`。

## 运行

配置完成后，启动你的解释器即可启动 OneAnime.js 服务器：

```bash
oneanime /path/to/your/config.json
```

建议使用 pm2 或 systemd 等工具确保服务器持续运行。

## 缓存

为了减少不必要的资源浪费，每次 OneAnime.js 执行转换操作，转换结果都会被缓存，并被保存到各图集文件夹下的 `.oneanime` 文件夹。

一般情况下不建议清理缓存，但如果确实需要，直接删除各图集文件夹下的 `.oneanime` 文件夹即可。
