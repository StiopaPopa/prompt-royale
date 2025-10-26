import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Google OAuth credentials
// Get them from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = "916465466525-sdbtg2fv6tlnurtku7gc6mm7vnboc7pk.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

// Generated with: openssl rand -base64 32
// Or use any random 32+ character string
const NEXTAUTH_SECRET = "your-super-secret-key-change-this-in-production-minimum-32-characters";
const NEXTAUTH_URL = "http://localhost:3000";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect to home page after sign in
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
      }
      return session;
    },
  },
  secret: NEXTAUTH_SECRET,
  debug: true, // Enable debug mode to see what's happening
};
