import mongoose, { Types } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string | null;
  language?: string;
  avatarKey?: string | null;
  isActive: boolean;
  deletedAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserMethods {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toPublicJSON(): any;
}

interface UserModel extends mongoose.Model<IUser, {}, UserMethods> {
  findByEmail(email: string): Promise<mongoose.HydratedDocument<IUser, UserMethods> | null>;
}

const userSchema = new mongoose.Schema<IUser, UserModel, UserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: "PASSENGER" },
    phone: { type: String, default: null },
    language: { type: String, default: "en" },
    avatarKey: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

userSchema.methods.toPublicJSON = function (this: mongoose.HydratedDocument<IUser, UserMethods>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = this.toObject() as any;
  delete user.password;
  return user;
};

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase(), deletedAt: null });
};

export type SafeUser = IUser & { _id: Types.ObjectId };

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
