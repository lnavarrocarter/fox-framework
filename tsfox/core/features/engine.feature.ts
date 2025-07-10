import { executeActions, parseSections, replaceVariableSymbols, replaceVariables, wrapHTML } from "./fox/fox.engine.function";

const fs = require('fs') // this engine requires the fs module

export function engineFox(filePath: any, options: any, callback: any) {
    fs.readFile(filePath, (err: any, content: { toString: () => string }) => {
        if (err) return callback(err)
        
        let rendered = content.toString();
        
        // Simple variable replacement with {{variable}} syntax
        if (options) {
            rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match: string, variable: string) => {
                if (options.hasOwnProperty(variable)) {
                    return options[variable];
                }
                return match; // Keep unreplaced variables
            });
            
            // Handle nested variables like {{user.name}}
            rendered = rendered.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match: string, obj: string, prop: string) => {
                if (options[obj] && options[obj][prop] !== undefined) {
                    return options[obj][prop];
                }
                return match; // Keep unreplaced variables
            });
        }

        return callback(null, rendered)
    })
}


export function engineHtml(filePath: any, options: any, callback: any) {
    fs.readFile(filePath, (err: any, content: { toString: () => string }) => {
        if (err) return callback(err)
        // this is an extremely simple template engine
        const rendered = content.toString()
            .replace('#title#', '<title>' + options.title + '</title>')
            .replace('#message#', '<h1>' + options.message + '</h1>')

        return callback(null, rendered)
    })
}



