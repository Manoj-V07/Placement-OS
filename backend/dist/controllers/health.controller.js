"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHealth = void 0;
const firebase_1 = require("../config/firebase");
const checkHealth = async (req, res) => {
    let databaseStatus = 'disconnected';
    try {
        // A simple test to check Firestore connection
        await firebase_1.db.collection('_health_check').limit(1).get();
        databaseStatus = 'connected';
    }
    catch (error) {
        console.error('Firestore health check failed:', error);
    }
    res.status(200).json({
        success: true,
        server: 'running',
        database: databaseStatus
    });
};
exports.checkHealth = checkHealth;
