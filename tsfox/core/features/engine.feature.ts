const fs = require('fs') // this engine requires the fs module

module.exports = function (filePath: any, options: any, callback: any) {
    fs.readFile(filePath, (err: any, content: { toString: () => string }) => {
        if (err) return callback(err)
        // this is an extremely simple template engine
        const rendered = content.toString()
            .replace('#title#', '<title>' + options.title + '</title>')
            .replace('#message#', '<h1>' + options.message + '</h1>')
            
        return callback(null, rendered)
    })
}
