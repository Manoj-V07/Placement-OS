"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const env_1 = require("./env");
if (!(0, app_1.getApps)().length) {
    try {
        const credential = env_1.env.FIREBASE_PROJECT_ID && env_1.env.FIREBASE_CLIENT_EMAIL && env_1.env.FIREBASE_PRIVATE_KEY
            ? (0, app_1.cert)({
                projectId: env_1.env.FIREBASE_PROJECT_ID,
                clientEmail: env_1.env.FIREBASE_CLIENT_EMAIL,
                privateKey: env_1.env.FIREBASE_PRIVATE_KEY,
            })
            : undefined;
        (0, app_1.initializeApp)(credential ? { credential } : undefined);
        console.log('Firebase Admin initialized successfully');
    }
    catch (error) {
        console.error('Firebase Admin initialization error', error);
    }
}
exports.db = (0, firestore_1.getFirestore)();
exports.auth = (0, auth_1.getAuth)();
