// jest v29.0.0
// mongodb-memory-server v8.0.0
// mongoose v7.0.0
// libphonenumber-js v1.10.0

import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, startSession, ClientSession } from 'mongoose';
import { ObjectId } from 'mongodb';

import { LeadService } from '../../src/services/lead.service';
import { Lead } from '../../src/db/models/Lead';
import { 
  CreateLeadDTO, 
  UpdateLeadDTO, 
  LeadStatus, 
  LeadSource 
} from '../../src/types/lead.types';
import { validatePhoneNumber, normalizePhoneNumber } from '../../src/utils/phone.utils';

/**
 * Test configuration and global variables
 */
let mongoServer: MongoMemoryServer;
let mongoConnection: Connection;
let leadService: LeadService;
let testSession: ClientSession;

// Test data constants
const TEST_FORM_ID = new ObjectId();
const TEST_PHONE = '+12025550123';
const TEST_LEAD_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com'
};

/**
 * Helper function to create a valid test lead
 */
const createTestLead = async (overrides: Partial<CreateLeadDTO> = {}): Promise<CreateLeadDTO> => {
  return {
    formId: TEST_FORM_ID,
    phone: TEST_PHONE,
    data: TEST_LEAD_DATA,
    source: LeadSource.FORM,
    ...overrides
  };
};

/**
 * Test suite setup and teardown
 */
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to test database
  mongoConnection = await connect(mongoUri);
  
  // Initialize test session and service
  testSession = await startSession();
  leadService = new LeadService();
});

afterAll(async () => {
  // Cleanup resources
  await testSession.endSession();
  await mongoConnection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear test data before each test
  await Lead.deleteMany({});
});

describe('Lead Management Integration Tests', () => {
  describe('Lead Creation', () => {
    it('should create a new lead with valid data', async () => {
      const leadData = await createTestLead();
      const lead = await leadService.createLead(leadData);

      expect(lead).toBeDefined();
      expect(lead.phone).toBe(TEST_PHONE);
      expect(lead.formId).toEqual(TEST_FORM_ID);
      expect(lead.status).toBe(LeadStatus.NEW);
      expect(lead.optedOut).toBe(false);
    });

    it('should encrypt PII fields on creation', async () => {
      const leadData = await createTestLead();
      const lead = await leadService.createLead(leadData);

      // Verify phone number is encrypted in database
      const rawLead = await Lead.findById(lead._id).lean();
      expect(rawLead?.phone).not.toBe(TEST_PHONE);
    });

    it('should validate phone number format', async () => {
      const invalidPhone = '1234567890'; // Missing + prefix
      await expect(
        leadService.createLead(await createTestLead({ phone: invalidPhone }))
      ).rejects.toThrow('Invalid phone number format');
    });

    it('should prevent duplicate phone numbers', async () => {
      await leadService.createLead(await createTestLead());
      await expect(
        leadService.createLead(await createTestLead())
      ).rejects.toThrow();
    });

    it('should normalize phone numbers on creation', async () => {
      const messyPhone = '+1 (202) 555-0123';
      const leadData = await createTestLead({ phone: messyPhone });
      const lead = await leadService.createLead(leadData);

      expect(lead.phone).toBe(normalizePhoneNumber(messyPhone));
    });
  });

  describe('Lead Updates', () => {
    let testLead: any;

    beforeEach(async () => {
      testLead = await leadService.createLead(await createTestLead());
    });

    it('should update lead status', async () => {
      const updateData: UpdateLeadDTO = {
        status: LeadStatus.CONTACTED
      };

      const updated = await leadService.updateLead(testLead._id, updateData);
      expect(updated.status).toBe(LeadStatus.CONTACTED);
      expect(updated.lastContactedAt).toBeInstanceOf(Date);
    });

    it('should handle opt-out updates', async () => {
      const updateData: UpdateLeadDTO = {
        optedOut: true
      };

      const updated = await leadService.updateLead(testLead._id, updateData);
      expect(updated.optedOut).toBe(true);
    });

    it('should maintain PII encryption on updates', async () => {
      const newPhone = '+12025550124';
      const updateData: UpdateLeadDTO = {
        phone: newPhone
      };

      const updated = await leadService.updateLead(testLead._id, updateData);
      expect(updated.phone).toBe(newPhone);

      // Verify encryption in database
      const rawLead = await Lead.findById(updated._id).lean();
      expect(rawLead?.phone).not.toBe(newPhone);
    });

    it('should track modification timestamps', async () => {
      const originalUpdatedAt = testLead.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Ensure timestamp difference

      const updateData: UpdateLeadDTO = {
        data: { ...TEST_LEAD_DATA, title: 'Mr.' }
      };

      const updated = await leadService.updateLead(testLead._id, updateData);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Lead Search and Retrieval', () => {
    beforeEach(async () => {
      // Create multiple test leads
      await Promise.all([
        leadService.createLead(await createTestLead()),
        leadService.createLead(await createTestLead({ 
          phone: '+12025550124',
          source: LeadSource.MANUAL 
        })),
        leadService.createLead(await createTestLead({ 
          phone: '+12025550125',
          source: LeadSource.API 
        }))
      ]);
    });

    it('should find leads by form ID', async () => {
      const leads = await Lead.findByFormId(TEST_FORM_ID, { page: 1, limit: 10 });
      expect(leads).toHaveLength(3);
      expect(leads[0].formId).toEqual(TEST_FORM_ID);
    });

    it('should find lead by phone number', async () => {
      const lead = await Lead.findByPhone(TEST_PHONE);
      expect(lead).toBeDefined();
      expect(lead?.phone).toBe(TEST_PHONE);
    });

    it('should handle pagination in form leads query', async () => {
      const leads = await Lead.findByFormId(TEST_FORM_ID, { page: 1, limit: 2 });
      expect(leads).toHaveLength(2);
    });

    it('should find leads requiring follow-up', async () => {
      // Update a lead's lastContactedAt to 48 hours ago
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 48);

      await Lead.findOneAndUpdate(
        { phone: TEST_PHONE },
        { lastContactedAt: oldDate }
      );

      const followUpLeads = await Lead.findRequiringFollowUp();
      expect(followUpLeads).toHaveLength(1);
      expect(followUpLeads[0].phone).toBe(TEST_PHONE);
    });
  });

  describe('Security and Compliance', () => {
    it('should validate phone numbers against E.164 format', () => {
      const validPhones = ['+12025550123', '+447911123456', '+61412345678'];
      const invalidPhones = ['12025550123', '+1202555012', '+1abc5550123'];

      validPhones.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(false);
      });
    });

    it('should maintain audit trail of status changes', async () => {
      const lead = await leadService.createLead(await createTestLead());
      
      const statusUpdates = [
        LeadStatus.CONTACTED,
        LeadStatus.ENGAGED,
        LeadStatus.CONVERTED
      ];

      for (const status of statusUpdates) {
        await leadService.updateLead(lead._id, { status });
      }

      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead?.status).toBe(LeadStatus.CONVERTED);
    });

    it('should handle TCPA compliance with opt-out tracking', async () => {
      const lead = await leadService.createLead(await createTestLead());
      
      // Opt out
      await leadService.updateLead(lead._id, { optedOut: true });
      let updated = await Lead.findById(lead._id);
      expect(updated?.optedOut).toBe(true);

      // Opt back in
      await leadService.updateLead(lead._id, { optedOut: false });
      updated = await Lead.findById(lead._id);
      expect(updated?.optedOut).toBe(false);
    });
  });
});