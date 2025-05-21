import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { getServerSession } from "next-auth/next"

// Deklarasi modul untuk mengatasi error bcryptjs
declare module 'bcryptjs' {
  export function compare(s: string, hash: string): Promise<boolean>;
}

// Extend tipe user session untuk mengatasi error id
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    })
  ],
  callbacks: {
    // @ts-ignore - Abaikan error tipe untuk callback signIn
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google" || account?.provider === "apple") {
          if (!user.email) {
            console.error("No email provided by OAuth provider");
            return false;
          }

          const existingUser = await db.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (!existingUser) {
            // Create new user if doesn't exist
            await db.user.create({
              data: {
                email: user.email,
                name: user.name || "",
                image: user.image,
                isVerified: true,
                accounts: {
                  create: {
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                  }
                }
              },
            });
            return true;
          }

          // If user exists but doesn't have an account with this provider
          if (!existingUser.accounts.some(acc => acc.provider === account.provider)) {
            await db.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }
          return true;
        }
        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

export const getCurrentUser = async () => {
  const session = await getServerSession(authOptions);
  return session?.user;
};

export const requireUser = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user) {
    console.error("User not authenticated");
    throw new Error("Unauthorized");
  }
  
  if (!user.id) {
    console.error("User ID missing in session", user);
    throw new Error("Invalid session - missing user ID");
  }
  
  // Validate user ID format to avoid database errors
  if (typeof user.id !== 'string' || user.id.trim() === '') {
    console.error("Invalid user ID format", user.id);
    throw new Error("Invalid user ID format");
  }
  
  // Verify user exists in database for critical operations
  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true }
    });
    
    if (!dbUser) {
      console.error("User not found in database despite valid session", user.id);
      throw new Error("User not found");
    }
    
    // Return validated user object with required properties
    return {
      id: user.id,
      email: user.email || "",
      name: user.name || "",
      image: user.image || ""
    };
  } catch (error) {
    console.error("Database error when verifying user:", error);
    throw new Error("Authentication error");
  }
};
