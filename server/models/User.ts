import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends mongoose.Document {
  nume: string;
  prenume: string;
  nrTelefon: string;
  email: string;
  parola?: string; // Made optional to handle delete user.parola
  isEmailVerified: boolean;
  isSMSVerified: boolean;
  preferredVerification: "email" | "sms";
  emailVerificationToken?: string;
  smsVerificationCode?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  githubId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    nume: {
      type: String,
      required: [true, "Numele este obligatoriu"],
      trim: true,
      minlength: [2, "Numele trebuie să aibă cel puțin 2 caractere"],
      maxlength: [50, "Numele nu poate avea mai mult de 50 de caractere"],
    },
    prenume: {
      type: String,
      required: [true, "Prenumele este obligatoriu"],
      trim: true,
      minlength: [2, "Prenumele trebuie să aibă cel puțin 2 caractere"],
      maxlength: [50, "Prenumele nu poate avea mai mult de 50 de caractere"],
    },
    nrTelefon: {
      type: String,
      required: [true, "Numărul de telefon este obligatoriu"],
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^(\+40|0040|0)[267]\d{8}$/.test(v);
        },
        message: "Numărul de telefon nu este valid (format românesc)",
      },
    },
    email: {
      type: String,
      required: [true, "Email-ul este obligatoriu"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Email-ul nu este valid",
      },
    },
    parola: {
      type: String,
      required: [true, "Parola este obligatorie"],
      minlength: [8, "Parola trebuie să aibă cel puțin 8 caractere"],
      validate: {
        validator: function (v: string) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
            v
          );
        },
        message:
          "Parola trebuie să conțină cel puțin: o literă mică, o literă mare, o cifră și un caracter special",
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isSMSVerified: {
      type: Boolean,
      default: false,
    },
    preferredVerification: {
      type: String,
      enum: ["email", "sms"],
      required: [true, "Metoda de verificare este obligatorie"],
    },
    emailVerificationToken: {
      type: String,
      sparse: true,
    },
    smsVerificationCode: {
      type: String,
      sparse: true,
    },
    resetPasswordToken: {
      type: String,
      sparse: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
    githubId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret.parola;
        delete ret.emailVerificationToken;
        delete ret.smsVerificationCode;
        delete ret.resetPasswordToken;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("parola") || !this.parola) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.parola = await bcrypt.hash(this.parola, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.parola);
};

// Check if email exists
userSchema.statics.isEmailTaken = async function (
  email: string,
  excludeUserId?: string
) {
  const user = await this.findOne({
    email,
    ...(excludeUserId && { _id: { $ne: excludeUserId } }),
  });
  return !!user;
};

// Check if phone number exists
userSchema.statics.isPhoneTaken = async function (
  nrTelefon: string,
  excludeUserId?: string
) {
  const user = await this.findOne({
    nrTelefon,
    ...(excludeUserId && { _id: { $ne: excludeUserId } }),
  });
  return !!user;
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;