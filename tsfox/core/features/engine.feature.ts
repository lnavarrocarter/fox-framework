import { executeActions, parseSections, replaceVariableSymbols, replaceVariables, wrapHTML } from "./fox/fox.engine.function";

const fs = require('fs') // this engine requires the fs module

export function engineFox(filePath: any, options: any, callback: any) {
    fs.readFile(filePath, (err: any, content: { toString: () => string }) => {
        if (err) return callback(err)
        // Parse the file content
        const sections = parseSections(content);
        // Process each section
        const processedSections = sections.map(section => {
            // Replace variables with input values
            const processedSection = replaceVariables(section, options);
            // Execute actions
            const result = replaceVariableSymbols(executeActions(processedSection), options);
            return result;
        });

        // Concatenate processed sections and wrap in HTML tags
        const rendered = wrapHTML(processedSections.join(''));

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



