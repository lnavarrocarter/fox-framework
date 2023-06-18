export function parseSections(data: any) {
    const sectionRegex = /<section>(.*?)<\/section>/gs;
    const sections = [];
    let match;

    while ((match = sectionRegex.exec(data))) {
        sections.push(match[1]);
    }

    return sections;
}

export function replaceVariables(section: string, options: { [x: string]: any; hasOwnProperty: (arg0: any) => any; }) {
    const variableRegex = /Input::(\w+)/g;
    const processedSection = section.replace(variableRegex, (_: any, variable: string | number) => {
        if (options.hasOwnProperty(variable)) {
            return options[variable];
        }
        return '';
    });

    return replaceVariableSymbols(processedSection, options);;
}

export function replaceVariableSymbols(section: string, options: { [x: string]: any; hasOwnProperty: (arg0: any) => any; }) {
  const variableSymbolRegex = /\$(\w+)/g;
  const processedSection = section.replace(variableSymbolRegex, (_: any, variable: string | number) => {
    if (options.hasOwnProperty(variable)) {
      return options[variable];
    }
    return '';
  });

  return processedSection;
}

export function executeActions(section: string) {
    const actionRegex = /<action>(Exec::.*?)<\/action>/gs;
    let match;

    while ((match = actionRegex.exec(section))) {
        const action = match[1];
        const result = evaluateAction(action);
        section = section.replace(match[0], result);
    }

    return section;
}

export function evaluateAction(action: string) {
    const functionCallRegex = /()=>\[(\w+)\]/;
    const match = functionCallRegex.exec(action);

    if (!match) {
        return action;
    }

    const functionName: any = match[1];

    if (typeof window !== 'undefined' && window[functionName] && typeof window[functionName] === 'function') {
        try {
            return eval(functionName);
        } catch (error) {
            console.error(`Error executing action function '${functionName}':`, error);
            return '';
        }
    }

    console.error(`Action function '${functionName}' is not defined.`);
    return '';
}

export function wrapHTML(content: string) {
    return `<html><body>${content}</body></html>`;
}