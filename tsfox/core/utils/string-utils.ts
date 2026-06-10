// tsfox/core/utils/string-utils.ts
// Shared string formatting utilities for code generation

/**
 * Formats a name into PascalCase class name.
 * Handles camelCase, PascalCase, kebab-case, snake_case, and combinations.
 */
export const formatClassName = (name: string): string => {
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((word, index, arr) => {
            if (word.length > 1 && word === word.toUpperCase()) {
                // Preserve acronym if next segment is 'Controller' (API -> API)
                if (arr[index + 1] && arr[index + 1].toLowerCase() === 'controller') {
                    return word;
                }
                // Otherwise normalize to PascalCase (USER -> User)
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
};

/**
 * Formats a name into kebab-case file name.
 * Handles camelCase, PascalCase, snake_case, and sequences like APIController -> api-controller.
 */
export const formatFileName = (name: string): string => {
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[-_\s]+/g, '-')
        .replace(/^-|-$/g, '');
};
