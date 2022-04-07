// noinspection RequiredAttributes,HttpUrlsUsage

const { Command } = require('commander');
const path = require("path");
const fs = require("fs");
const Tools = require("./utils/Tools");
const express = require("express");
const serveIndex = require("serve-index");
const multer  = require('multer')


const program = new Command();

program
    .name('valetudo-helper-httpbridge')
    .description('Utility Webserver')
    .version('2022.04.0')
    .option('-p, --port <port>', "webserver port (default: random)")
    .option('-d, --directory <path>', "directory", "./www/")


program.parse();

const options = program.opts();

const port = parseInt(options.port) || 0;
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

const server = expressApp.listen(port, () => {
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
});
