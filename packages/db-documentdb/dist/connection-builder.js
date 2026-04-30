"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDocumentDbUri = buildDocumentDbUri;
function buildDocumentDbUri(config) {
    // If tls is false, return uri as-is
    if (config.tls === false)
        return config.uri;
    // Build URL search params for DocumentDB
    const url = new URL(config.uri);
    url.searchParams.set('tls', 'true');
    url.searchParams.set('retryWrites', 'false');
    url.searchParams.set('readPreference', 'secondaryPreferred');
    if (config.tlsCaFile) {
        url.searchParams.set('tlsCAFile', config.tlsCaFile);
    }
    return url.toString();
}
//# sourceMappingURL=connection-builder.js.map