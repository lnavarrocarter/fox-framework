"use strict";
/**
 * @foxframework/auth-2fa — barrel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaMiddleware = exports.EmailOtpProvider = exports.TotpMfaProvider = void 0;
var totp_provider_1 = require("./totp.provider");
Object.defineProperty(exports, "TotpMfaProvider", { enumerable: true, get: function () { return totp_provider_1.TotpMfaProvider; } });
var email_otp_provider_1 = require("./email-otp.provider");
Object.defineProperty(exports, "EmailOtpProvider", { enumerable: true, get: function () { return email_otp_provider_1.EmailOtpProvider; } });
var mfa_middleware_1 = require("./mfa.middleware");
Object.defineProperty(exports, "MfaMiddleware", { enumerable: true, get: function () { return mfa_middleware_1.MfaMiddleware; } });
//# sourceMappingURL=index.js.map