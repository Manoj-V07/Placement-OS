"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logger_middleware_1 = require("./middlewares/logger.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const v1_1 = __importDefault(require("./routes/v1"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(logger_middleware_1.logger);
// API Routes
app.use('/api/v1', v1_1.default);
// Centralized error handler
app.use(error_middleware_1.errorHandler);
exports.default = app;
