// noinspection RequiredAttributes,HttpUrlsUsage

const { Command } = require('commander');
const path = require("path");
const fs = require("fs");
const http = require("http");
const Tools = require("./utils/Tools");
const express = require("express");
const serveIndex = require("serve-index");
const multer  = require('multer')


const program = new Command();

program
    .name('valetudo-helper-httpbridge')
    .description('Utility Webserver')
    .version('2023.08.0')
    .option('-p, --port <port>', "webserver port (default: 1337)")
    .option('-d, --directory <path>', "directory", "./www/")


program.parse();

const options = program.opts();

const port = parseInt(options.port) || undefined;
const directory = path.resolve(options.directory);
const uploadDir = path.join(directory, "./uploads/");

console.log("Starting valetudo-helper-httpbridge");
console.log("Note that uploads will happily overwrite existing files. Please be careful");
console.log(""); //newline

if(!fs.existsSync(directory)) {
    console.log(`Directory "${directory}" does not exist. Creating..`);

    Tools.MK_DIR_PATH(directory);
}

if(!fs.existsSync(uploadDir)) {
    console.log(`Upload directory "${uploadDir}" does not exist. Creating..`);

    Tools.MK_DIR_PATH(uploadDir);
}


const expressApp = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
const upload = multer({ storage: storage })

expressApp.post('/upload', upload.single('file'), function (req, res, next) {
    console.log(`[${new Date().toISOString()}] Client "${req.ip}" successfully uploaded file to "${req.file.path}"`);

    res.status(200).send(`Successfully uploaded file to "${req.file.path}"` + "\n");
})

expressApp.use('/', express.static(directory), serveIndex(directory, {'icons': true}));

const server = http.createServer(expressApp);
const ports = port !== undefined ? [port] : [1337, 1338, 1339, 8080, 8888, 0];
let portToUse;
let infoTimeout;

const onSuccessFullListen = () => {
    const IPs = Tools.GET_CURRENT_HOST_IPV4_ADDRESSES();

    console.log(""); //newline
    console.log("valetudo-helper-httpbridge started successfully.");
    console.log(`It is serving "${directory}" via:`)


    IPs.forEach(ip => {
        console.log("\n");

        console.log(`http://${ip}:${server.address().port}/`);
        console.log("Download example:\t" + `wget http://${ip}:${server.address().port}/file.tar`);
        console.log("Upload example:\t\t" + `curl -X POST http://${ip}:${server.address().port}/upload -F 'file=@./file.tar'`);
        console.log("File listing is also available");
    });

    console.log("\n");
}

const tryListen = () => {
    portToUse = ports.shift();
    
    if (portToUse !== undefined) {
        server.listen(portToUse, () => {
            if (infoTimeout) {
                clearTimeout(infoTimeout);
            }
            
            // This can't be right but apparently it is the correct way to do it if you want retry logic with different ports?
            infoTimeout = setTimeout(() => {
                onSuccessFullListen();
            }, 500)
        });
    } else {
        console.log("\nExiting..");
        process.exit(1);
    }
}

server.on("error", (err) => {
    if (err.code === 'EADDRINUSE') {
        if (ports.length === 0) {
            console.log(`ERROR: Port ${portToUse} is already in use.`);
        }
        
        tryListen();
    } else {
        console.error('An error occurred:', err);
    }
});

tryListen();