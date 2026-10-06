import request from 'supertest';
import app from '../app';

// Mock the firebase config
jest.mock('../config/firebase', () => {
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockDelete = jest.fn();
  const mockVerifyIdToken = jest.fn();
  const mockDeleteUser = jest.fn();

  return {
    db: {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: mockGet,
          set: mockSet,
          delete: mockDelete
        })
      })
    },
    auth: {
      verifyIdToken: mockVerifyIdToken,
      deleteUser: mockDeleteUser
    },
    __mocks: {
      mockGet,
      mockSet,
      mockDelete,
      mockVerifyIdToken,
      mockDeleteUser
    }
  };
});

import * as firebase from '../config/firebase';
const { db, auth, __mocks } = firebase as any;

describe('User Authentication & Management (Phase 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('A. Authentication', () => {
    it('Missing token -> 401', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized: Missing or invalid token');
    });

    it('Invalid/Expired token -> 401', async () => {
      __mocks.mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
      const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer invalid_token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized: Invalid or expired token');
    });

    it('Valid token -> request succeeds', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'testuid123', email: 'test@example.com', name: 'Test User' });
      __mocks.mockGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'testuid123', name: 'Test User' }) });

      const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer valid_token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('B. User Profile', () => {
    it('First authenticated request creates/returns profile', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'newuser123', email: 'new@example.com', name: 'New User' });
      
      // First get returns false (doesn't exist)
      __mocks.mockGet.mockResolvedValueOnce({ exists: false });
      // Second get (after set) returns the newly created doc
      __mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ uid: 'newuser123', name: 'New User' }) });

      const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer new_token');
      
      expect(res.status).toBe(200);
      expect(__mocks.mockSet).toHaveBeenCalled();
      
      // verify the defaults are passed correctly
      const setCallArg = __mocks.mockSet.mock.calls[0][0];
      expect(setCallArg.uid).toBe('newuser123');
      expect(setCallArg.email).toBe('new@example.com');
      expect(setCallArg.name).toBe('New User');
    });

    it('Existing user receives existing profile', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'userA' });
      __mocks.mockGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'userA', placementGoal: 'Google' }) });

      const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer token_a');
      
      expect(res.status).toBe(200);
      expect(res.body.data.placementGoal).toBe('Google');
      expect(__mocks.mockSet).not.toHaveBeenCalled();
    });

    it('Profile update changes allowed fields', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'userA' });
      __mocks.mockGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'userA' }) });
      
      // We pass dailyStudyTarget as an update
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer token_a')
        .send({ dailyStudyTarget: 120, uid: 'malicious_uid', email: 'malicious@email.com' }); // trying to inject uid/email

      expect(res.status).toBe(200);
      expect(__mocks.mockSet).toHaveBeenCalled();
      
      // The schema should strip 'uid' and 'email' because they are not in Joi schema (stripUnknown: true)
      const setCallArg = __mocks.mockSet.mock.calls[0][0];
      expect(setCallArg.dailyStudyTarget).toBe(120);
      expect(setCallArg.uid).toBeUndefined();
      expect(setCallArg.email).toBeUndefined();
    });
  });

  describe('C. User Isolation', () => {
    it('User A cannot access User B profile', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'userA' });
      
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer token_a');
      
      // user.controller uses req.user?.uid directly, making it impossible to pass user B's UID manually
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.collection('users').doc).toHaveBeenCalledWith('userA');
    });
  });

  describe('D. Validation', () => {
    it('Invalid dailyStudyTarget is rejected', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'userA' });
      
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer token_a')
        .send({ dailyStudyTarget: -10 }); 

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  describe('E. Error Handling', () => {
    it('Firestore failure produces a controlled API error', async () => {
      __mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'userA' });
      __mocks.mockGet.mockRejectedValue(new Error('Firestore connection failed'));

      const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer token_a');
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Firestore connection failed');
    });
  });
});
