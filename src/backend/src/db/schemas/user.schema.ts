import { Schema, model, Model } from 'mongoose'; // v7.0.0
import bcrypt from 'bcryptjs'; // v2.4.3
import { IUser } from '../../interfaces/IUser';
import { UserRole } from '../../types/auth.types';

/**
 * Extended interface for User model with static methods
 */
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByOrganization(organizationId: string, role?: UserRole): Promise<IUser[]>;
  findByRole(role: UserRole): Promise<IUser[]>;
}

/**
 * MongoDB schema definition for user documents.
 * Implements comprehensive validation, security features, and role-based access control.
 * 
 * @see Technical Specifications/7.1 AUTHENTICATION AND AUTHORIZATION
 * @see Technical Specifications/7.2 DATA SECURITY
 */
export const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: 'Invalid email format'
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: (password: string) => 
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(password),
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'User role is required'],
      default: UserRole.READ_ONLY
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Organization ID is required'],
      ref: 'Organization'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      }
    }
  }
);

// Indexes for optimized querying
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, role: 1 }, { background: true });
UserSchema.index(
  { passwordResetToken: 1 },
  { sparse: true, expireAfterSeconds: 3600 }
);

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email
UserSchema.statics.findByEmail = async function(
  email: string
): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find users by organization
UserSchema.statics.findByOrganization = async function(
  organizationId: string,
  role?: UserRole
): Promise<IUser[]> {
  const query: Record<string, any> = { organizationId, isActive: true };
  if (role) query.role = role;
  return this.find(query).select('-password');
};

// Static method to find users by role
UserSchema.statics.findByRole = async function(
  role: UserRole
): Promise<IUser[]> {
  return this.find({ role, isActive: true }).select('-password');
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * User model with static methods and middleware
 * Implements secure password handling and efficient querying capabilities
 */
export const User = model<IUser, IUserModel>('User', UserSchema);