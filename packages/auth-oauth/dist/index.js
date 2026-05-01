"use strict";
/**
 * @foxframework/auth-oauth — barrel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftStrategy = exports.InstagramStrategy = exports.FacebookStrategy = exports.GitHubStrategy = exports.GoogleStrategy = exports.OAuthProvider = void 0;
var oauth_provider_1 = require("./oauth.provider");
Object.defineProperty(exports, "OAuthProvider", { enumerable: true, get: function () { return oauth_provider_1.OAuthProvider; } });
var google_1 = require("./strategies/google");
Object.defineProperty(exports, "GoogleStrategy", { enumerable: true, get: function () { return google_1.GoogleStrategy; } });
var github_1 = require("./strategies/github");
Object.defineProperty(exports, "GitHubStrategy", { enumerable: true, get: function () { return github_1.GitHubStrategy; } });
var facebook_1 = require("./strategies/facebook");
Object.defineProperty(exports, "FacebookStrategy", { enumerable: true, get: function () { return facebook_1.FacebookStrategy; } });
var instagram_1 = require("./strategies/instagram");
Object.defineProperty(exports, "InstagramStrategy", { enumerable: true, get: function () { return instagram_1.InstagramStrategy; } });
var microsoft_1 = require("./strategies/microsoft");
Object.defineProperty(exports, "MicrosoftStrategy", { enumerable: true, get: function () { return microsoft_1.MicrosoftStrategy; } });
//# sourceMappingURL=index.js.map