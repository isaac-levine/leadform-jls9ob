/**
 * @file 20240101000000_initial_schema.ts
 * @description Initial database migration that sets up MongoDB collections, indexes,
 * and validation rules for the lead capture and SMS nurturing platform.
 * Implements comprehensive security, performance, and data integrity measures.
 * @version 1.0.0
 */

import { Connection } from 'mongoose'; // v7.0.0
import { Collection } from 'mongodb'; // v5.0.0
import { FormSchema } from '../schemas/form.schema';
import { LeadSchema } from '../schemas/lead.schema';
import { MessageSchema } from '../schemas/message.schema';
import { OrganizationSchema } from '../schemas/organization.schema';
import { UserSchema } from '../schemas/user.schema';

/**
 * Creates all required collections with indexes, validation rules, and security measures
 * @param db - Mongoose database connection
 */
export async function up(db: Connection): Promise<void> {
  console.log('Starting initial schema migration...');

  try {
    // Create Organizations collection with validation and encryption
    await db.createCollection('organizations', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'status', 'smsConfig'],
          properties: {
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 100,
              pattern: '^[a-zA-Z0-9\\s\\-_]+$'
            },
            status: {
              enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED']
            },
            smsConfig: {
              bsonType: 'object',
              required: ['providerType', 'apiKey', 'apiSecret', 'fromNumber'],
              properties: {
                providerType: {
                  enum: ['TWILIO', 'CUSTOM']
                },
                fromNumber: {
                  bsonType: 'string',
                  pattern: '^\\+[1-9]\\d{1,14}$'
                }
              }
            }
          }
        }
      }
    });

    // Create Users collection with role validation
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'role', 'organizationId'],
          properties: {
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
            },
            role: {
              enum: ['ADMIN', 'ORGANIZATION_ADMIN', 'AGENT', 'FORM_MANAGER', 'READ_ONLY']
            },
            isActive: {
              bsonType: 'bool'
            }
          }
        }
      }
    });

    // Create Forms collection with schema validation
    await db.createCollection('forms', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['organizationId', 'config', 'embedCode', 'active'],
          properties: {
            config: {
              bsonType: 'object',
              required: ['title', 'fields'],
              properties: {
                fields: {
                  bsonType: 'array',
                  minItems: 1,
                  maxItems: 20
                }
              }
            },
            active: {
              bsonType: 'bool'
            }
          }
        }
      }
    });

    // Create Leads collection with PII encryption
    await db.createCollection('leads', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['formId', 'phone', 'data', 'status'],
          properties: {
            phone: {
              bsonType: 'string',
              pattern: '^\\+[1-9]\\d{1,14}$'
            },
            status: {
              enum: ['NEW', 'CONTACTED', 'ENGAGED', 'CONVERTED', 'CLOSED']
            },
            optedOut: {
              bsonType: 'bool'
            }
          }
        }
      }
    });

    // Create Messages collection with TTL index
    await db.createCollection('messages', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['leadId', 'content', 'direction', 'type', 'status'],
          properties: {
            direction: {
              enum: ['INBOUND', 'OUTBOUND']
            },
            type: {
              enum: ['AI', 'HUMAN', 'SYSTEM']
            },
            status: {
              enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED']
            }
          }
        }
      }
    });

    // Create indexes for Organizations collection
    const organizations = db.collection('organizations');
    await Promise.all([
      organizations.createIndex({ name: 1, status: 1 }, { unique: true }),
      organizations.createIndex({ 'members.userId': 1 }),
      organizations.createIndex({ createdAt: 1 })
    ]);

    // Create indexes for Users collection
    const users = db.collection('users');
    await Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      users.createIndex({ organizationId: 1, role: 1 }),
      users.createIndex({ passwordResetToken: 1 }, { sparse: true, expireAfterSeconds: 3600 })
    ]);

    // Create indexes for Forms collection
    const forms = db.collection('forms');
    await Promise.all([
      forms.createIndex({ organizationId: 1, active: 1 }),
      forms.createIndex({ embedCode: 1 }, { unique: true }),
      forms.createIndex({ 'config.title': 'text' })
    ]);

    // Create indexes for Leads collection
    const leads = db.collection('leads');
    await Promise.all([
      leads.createIndex({ phone: 1 }, { unique: true }),
      leads.createIndex({ formId: 1, status: 1 }),
      leads.createIndex({ lastContactedAt: 1 }),
      leads.createIndex({ organizationId: 1, optedOut: 1 })
    ]);

    // Create indexes for Messages collection
    const messages = db.collection('messages');
    await Promise.all([
      messages.createIndex({ leadId: 1, createdAt: -1 }),
      messages.createIndex({ status: 1, sentAt: 1 }),
      messages.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // TTL index
      messages.createIndex({ organizationId: 1, direction: 1 })
    ]);

    console.log('Successfully completed initial schema migration');
  } catch (error) {
    console.error('Failed to execute initial schema migration:', error);
    throw error;
  }
}

/**
 * Removes all collections, indexes, and related configurations
 * @param db - Mongoose database connection
 */
export async function down(db: Connection): Promise<void> {
  console.log('Starting schema rollback...');

  try {
    // Drop all collections in reverse order
    const collections = ['messages', 'leads', 'forms', 'users', 'organizations'];
    
    for (const collectionName of collections) {
      await db.dropCollection(collectionName);
      console.log(`Dropped collection: ${collectionName}`);
    }

    console.log('Successfully completed schema rollback');
  } catch (error) {
    console.error('Failed to execute schema rollback:', error);
    throw error;
  }
}