"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const response_1 = require("../utils/response");
const env_1 = require("../config/env");
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    (0, response_1.sendResponse)(res, statusCode, false, message, env_1.env.NODE_ENV === 'development' ? { stack: err.stack } : null);
};
exports.errorHandler = errorHandler;
