import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "916465466525-sdbtg2fv6tlnurtku7gc6mm7vnboc7pk.apps.googleusercontent.com",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
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
      // Always redirect to the URL we came from, preserving the port
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      
      // If we have a callbackUrl in the URL, use that
      try {
        const urlObj = new URL(url);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');
        if (callbackUrl) return callbackUrl;
      } catch {}
      
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
      }
      return session;
    },
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || "your-super-secret-key-change-this-in-production-minimum-32-characters",
  debug: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
