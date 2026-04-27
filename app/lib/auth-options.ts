import type { NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
      version: "2.0",
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.handle = (profile as any).data?.username || (profile as any).screen_name;
        token.xId = (profile as any).data?.id || (profile as any).id_str;
        token.profileImage = (profile as any).data?.profile_image_url?.replace("_normal", "_400x400");
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).handle = token.handle;
      (session as any).xId = token.xId;
      (session as any).profileImage = token.profileImage;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
