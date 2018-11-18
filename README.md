# OneAnime.js

[关于本项目（简体中文）](https://github.com/OneAnimeTeam/oneanime.js/blob/master/README.zh-CN.md)

OneAnime.js is a random image server, the original purpose is to allow visitors to see a different blog header.

![version](https://img.shields.io/npm/v/oneanime.svg) ![license](https://img.shields.io/npm/l/oneanime.svg)

## Benefit

* It convert your images into `.webp` format automaticlly. It save your bandwidth and traffic.
* Can be used in production after easy configurion.

## Requirement

* Node.js 8.5+
* GraphicsMagick or ImageMagick WITH WebP support

## Configurion

First, you should get a template configure file via `oneanime init` command. It will be copied into your current working directory.

```json
{
    "path": ".",
    "serverAddress": "0.0.0.0",
    "serverPort": 8086,
    "enableWebP": true,
    "useImageMagick": false
}
```

* `path`：The path where the image collection is located. Can be relative to the path where the configuration file is located
* `serverAddress`：The server listens on the IP address. Note that 0.0.0.0 will cause the OneAnime.js server to be directly accessible on the extranet
* `serverPort`：The port on which the server is listening
* `enableWebP`：Whether to enable WebP conversion
* `useImageMagick`: Use ImageMagick instead of GraphicsMagick

You can put the collection of images in the directory you specified (`path`), only need to access the correct address when requested. For example, if you place an image in the image / photos directory, you can request `photos` directly. **Each image folder requires at least two valid images, otherwise it will be ignored.**

Accepted image type: `jpg`, `jpeg`, `gif`, `png`

## Execute

After the configuration is complete, start your OneAnime.js server:

```bash
oneanime /path/to/your/config.json
```

We recommend using tools such as **pm2** or **systemd** to ensure that the server is up and running.

## Cache

In order to reduce unnecessary waste of resources, each time OneAnime.js performs a conversion operation, the conversion result is cached and saved to the `.oneanime` folder under each image folder.

Under normal circumstances it is not recommended to clean up the cache, but if you really need, directly delete `.oneanime` from each image folder.

## License

Used BSD 3-Clause License.
