/**
 * @file form.test.ts
 * @description Integration tests for form management endpoints and services
 * @version 1.0.0
 */

import request from 'supertest'; // v6.3.3
import { MongoMemoryServer } from 'mongodb-memory-server'; // v8.12.0
import { expect } from 'jest'; // v29.0.0
import { ObjectId } from 'mongodb';
import { FormController } from '../../src/api/controllers/FormController';
import { FormService } from '../../src/services/form.service';
import { Form } from '../../src/db/models/Form';
import { IForm } from '../../src/interfaces/IForm';
import { FormFieldType } from '../../types/form.types';
import { ERROR_MESSAGES } from '../../constants/error.constants';

let mongoServer: MongoMemoryServer;
let testOrganizationId: string;
let testFormId: string;
let app: any; // Express application instance

// Mock form data for testing
const mockFormData = {
  organizationId: new ObjectId().toString(),
  config: {
    title: 'Test Lead Capture Form',
    description: 'Integration test form description',
    fields: [
      {
        id: 'fullName',
        type: FormFieldType.TEXT,
        label: 'Full Name',
        required: true,
        placeholder: 'Enter your full name'
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email Address',
        required: true,
        placeholder: 'Enter your email'
      },
      {
        id: 'phone',
        type: FormFieldType.PHONE,
        label: 'Phone Number',
        required: true,
        placeholder: '+1234567890'
      }
    ],
    submitButtonText: 'Submit Form',
    successMessage: 'Thank you for your submission!'
  },
  active: true
};

// Invalid form data for negative testing
const mockInvalidFormData = {
  organizationId: 'invalid-org-id',
  config: {
    title: '',
    fields: []
  }
};

/**
 * Setup test environment before all tests
 */
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Configure MongoDB connection
  process.env.MONGODB_URI = mongoUri;
  
  // Initialize test organization
  testOrganizationId = new ObjectId().toString();
  
  // Initialize Express app with controllers
  const formService = new FormService();
  const formController = new FormController(formService);
  app = /* Initialize your Express app with formController */;
});

/**
 * Clean up test environment after all tests
 */
afterAll(async () => {
  await Form.deleteMany({});
  await mongoServer.stop();
});

/**
 * Clear test data between tests
 */
beforeEach(async () => {
  await Form.deleteMany({});
});

describe('Form API Integration Tests', () => {
  describe('Form Creation', () => {
    it('should create a new form with valid data', async () => {
      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${generateTestToken()}`)
        .send(mockFormData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('embedCode');
      expect(response.body.data.config.fields).toHaveLength(3);
      
      testFormId = response.body.data._id;
    });

    it('should reject form creation with invalid data', async () => {
      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${generateTestToken()}`)
        .send(mockInvalidFormData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
    });

    it('should enforce field validation rules', async () => {
      const invalidFields = {
        ...mockFormData,
        config: {
          ...mockFormData.config,
          fields: [
            {
              id: 'invalid-email',
              type: FormFieldType.EMAIL,
              label: 'Invalid Email',
              required: true,
              placeholder: 'test'
            }
          ]
        }
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${generateTestToken()}`)
        .send(invalidFields);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Form Retrieval', () => {
    let createdFormId: string;

    beforeEach(async () => {
      // Create a test form
      const form = await Form.create(mockFormData);
      createdFormId = form._id.toString();
    });

    it('should retrieve form by ID', async () => {
      const response = await request(app)
        .get(`/api/forms/${createdFormId}`)
        .set('Authorization', `Bearer ${generateTestToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(createdFormId);
      expect(response.body.data.config.title).toBe(mockFormData.config.title);
    });

    it('should list forms by organization', async () => {
      const response = await request(app)
        .get('/api/forms')
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${generateTestToken()}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.forms)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should handle non-existent form ID', async () => {
      const nonExistentId = new ObjectId().toString();
      const response = await request(app)
        .get(`/api/forms/${nonExistentId}`)
        .set('Authorization', `Bearer ${generateTestToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
    });
  });

  describe('Form Updates', () => {
    let createdFormId: string;

    beforeEach(async () => {
      const form = await Form.create(mockFormData);
      createdFormId = form._id.toString();
    });

    it('should update form configuration', async () => {
      const updateData = {
        config: {
          ...mockFormData.config,
          title: 'Updated Form Title'
        }
      };

      const response = await request(app)
        .put(`/api/forms/${createdFormId}`)
        .set('Authorization', `Bearer ${generateTestToken()}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('Updated Form Title');
    });

    it('should toggle form active status', async () => {
      const response = await request(app)
        .patch(`/api/forms/${createdFormId}/status`)
        .set('Authorization', `Bearer ${generateTestToken()}`)
        .send({ active: false });

      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe(false);
    });
  });

  describe('Form Deletion', () => {
    let createdFormId: string;

    beforeEach(async () => {
      const form = await Form.create(mockFormData);
      createdFormId = form._id.toString();
    });

    it('should delete form by ID', async () => {
      const response = await request(app)
        .delete(`/api/forms/${createdFormId}`)
        .set('Authorization', `Bearer ${generateTestToken()}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const deletedForm = await Form.findById(createdFormId);
      expect(deletedForm).toBeNull();
    });
  });

  describe('Security Controls', () => {
    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .post('/api/forms')
        .send(mockFormData);

      expect(response.status).toBe(401);
    });

    it('should enforce organization-level access control', async () => {
      const differentOrgToken = generateTestToken('different-org-id');
      const response = await request(app)
        .get(`/api/forms/${testFormId}`)
        .set('Authorization', `Bearer ${differentOrgToken}`);

      expect(response.status).toBe(403);
    });

    it('should handle rate limiting', async () => {
      const requests = Array(101).fill(null).map(() => 
        request(app)
          .get('/api/forms')
          .set('Authorization', `Bearer ${generateTestToken()}`)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(r => r.status === 429);
      expect(tooManyRequests).toBe(true);
    });
  });
});

/**
 * Helper function to generate test JWT tokens
 */
function generateTestToken(orgId: string = testOrganizationId): string {
  // Implement test token generation
  return 'test-token';
}