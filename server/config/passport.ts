import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import User, { IUser } from "../models/User";

// Define Profile type manually since we're using require
interface Profile {
  id: string;
  username?: string;
  displayName?: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{ value: string; verified: boolean }>;
}

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (error: Error | null, user?: IUser | false) => void
    ) => {
      try {
        // Check if user already exists with this GitHub ID
        let user = await User.findOne({ githubId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        if (profile.emails && profile.emails.length > 0) {
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link GitHub account to existing user
            user.githubId = profile.id;
            user.isEmailVerified = true; // GitHub email is verified
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        const newUser = new User({
          nume: profile.name?.familyName || profile.username || "Nume",
          prenume: profile.name?.givenName || "Prenume",
          email:
            profile.emails?.[0]?.value || `${profile.username}@github.local`,
          nrTelefon: "0700000000", // Default phone number, user will need to update
          parola: "github-oauth-" + Math.random().toString(36), // Random password
          githubId: profile.id,
          isEmailVerified: true,
          preferredVerification: "email",
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        return done(
          error instanceof Error ? error : new Error("Unknown error"),
          undefined
        );
      }
    }
  )
);

passport.serializeUser(
  (user: Express.User, done: (err: Error | null, id?: string) => void) => {
    done(null, (user as IUser)._id?.toString());
  }
);

passport.deserializeUser(
  async (
    id: string,
    done: (err: Error | null, user?: IUser | null) => void
  ) => {
    try {
      const user = await User.findById(id).select("-parola");
      done(null, user);
    } catch (error) {
      done(error as Error, null);
    }
  }
);

export default passport;