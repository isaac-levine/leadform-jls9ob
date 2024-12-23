// MongoDB initialization script for Lead Capture & SMS Platform
// Version: 1.0.0
// MongoDB Version: ^7.0.0

// Create collections with schema validation and security features
function createCollections() {
  // Organizations Collection
  db.createCollection("organizations", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "status", "version", "createdAt", "updatedAt"],
        properties: {
          name: {
            bsonType: "string",
            description: "Organization name - required string"
          },
          status: {
            enum: ["active", "inactive", "suspended"],
            description: "Organization status - required enum"
          },
          smsConfig: {
            bsonType: "object",
            required: ["provider", "apiKey"],
            properties: {
              provider: { bsonType: "string" },
              apiKey: { bsonType: "string" },
              settings: { bsonType: "object" }
            }
          },
          version: {
            bsonType: "int",
            minimum: 1,
            description: "Document version for optimistic concurrency"
          },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" }
        }
      }
    }
  });

  // Users Collection
  db.createCollection("users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["email", "password", "role", "organizationId", "isEncrypted"],
        properties: {
          email: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
          },
          password: {
            bsonType: "string",
            minLength: 60, // For bcrypt hashed passwords
            maxLength: 60
          },
          role: {
            enum: ["admin", "organization_admin", "agent", "form_manager", "readonly"]
          },
          organizationId: { bsonType: "objectId" },
          lastLogin: { bsonType: "date" },
          isEncrypted: { bsonType: "bool" },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" }
        }
      }
    }
  });

  // Forms Collection
  db.createCollection("forms", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["organizationId", "config", "status", "version"],
        properties: {
          organizationId: { bsonType: "objectId" },
          config: {
            bsonType: "object",
            required: ["fields", "settings"],
            properties: {
              fields: { bsonType: "array" },
              settings: { bsonType: "object" }
            }
          },
          embedCode: { bsonType: "string" },
          status: {
            enum: ["draft", "active", "archived"]
          },
          version: { bsonType: "int" },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" }
        }
      }
    }
  });

  // Leads Collection
  db.createCollection("leads", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["formId", "phone", "data", "status"],
        properties: {
          formId: { bsonType: "objectId" },
          phone: {
            bsonType: "string",
            pattern: "^\\+[1-9]\\d{1,14}$" // E.164 format
          },
          data: { bsonType: "object" },
          status: {
            enum: ["new", "contacted", "qualified", "converted", "archived"]
          },
          optedOut: { bsonType: "bool" },
          isEncrypted: { bsonType: "bool" },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" }
        }
      }
    }
  });

  // Messages Collection
  db.createCollection("messages", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["conversationId", "content", "type", "timestamp"],
        properties: {
          conversationId: { bsonType: "objectId" },
          content: { bsonType: "string" },
          type: {
            enum: ["incoming", "outgoing", "system"]
          },
          isAI: { bsonType: "bool" },
          status: {
            enum: ["pending", "sent", "delivered", "failed"]
          },
          timestamp: { bsonType: "date" },
          metadata: { bsonType: "object" }
        }
      }
    }
  });

  // Templates Collection
  db.createCollection("templates", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["organizationId", "name", "content", "version"],
        properties: {
          organizationId: { bsonType: "objectId" },
          name: { bsonType: "string" },
          content: { bsonType: "string" },
          category: {
            enum: ["welcome", "followup", "qualification", "custom"]
          },
          version: { bsonType: "int" },
          isActive: { bsonType: "bool" },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" }
        }
      }
    }
  });
}

// Create optimized indexes for query performance
function createIndexes() {
  // Users indexes
  db.users.createIndex(
    { "email": 1 },
    { 
      unique: true,
      collation: { locale: "en", strength: 2 }
    }
  );
  db.users.createIndex(
    { "organizationId": 1, "role": 1 },
    { background: true }
  );

  // Forms indexes
  db.forms.createIndex(
    { "embedCode": 1 },
    { unique: true }
  );
  db.forms.createIndex(
    { "organizationId": 1, "status": 1 },
    { background: true }
  );

  // Leads indexes
  db.leads.createIndex(
    { "formId": 1, "phone": 1 },
    { background: true }
  );
  db.leads.createIndex(
    { "phone": 1 },
    { 
      partialFilterExpression: { "optedOut": false }
    }
  );

  // Messages indexes
  db.messages.createIndex(
    { "conversationId": 1, "timestamp": 1 },
    { background: true }
  );
  // TTL index for message retention (12 months)
  db.messages.createIndex(
    { "timestamp": 1 },
    { expireAfterSeconds: 31536000 }
  );

  // Templates indexes
  db.templates.createIndex(
    { "organizationId": 1, "category": 1 },
    { background: true }
  );
  
  // Text search indexes
  db.templates.createIndex(
    { "content": "text", "name": "text" },
    { 
      weights: {
        name: 10,
        content: 5
      }
    }
  );
}

// Initialize database
try {
  print("Starting database initialization...");
  
  createCollections();
  print("Collections created successfully");
  
  createIndexes();
  print("Indexes created successfully");
  
  print("Database initialization completed successfully");
} catch (error) {
  print("Error during database initialization:");
  print(error);
  throw error;
}