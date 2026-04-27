import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import TwitterProvider from "next-auth/providers/twitter";

interface TwitterProfile {
  id_str?: string;
  screen_name?: string;
  profile_image_url_https?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_API_KEY!,
      clientSecret: process.env.TWITTER_API_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const twitterProfile = profile as TwitterProfile;
        token.handle = twitterProfile.screen_name || "";
        token.xId = twitterProfile.id_str || "";
        token.profileImage =
          twitterProfile.profile_image_url_https?.replace(
            "_normal",
            "_400x400"
          ) || "";
        token.accessToken = account.oauth_token;
        token.accessSecret = account.oauth_token_secret;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      (session as Session & { handle: string; xId: string; profileImage: string }).handle = token.handle as string;
      (session as Session & { handle: string; xId: string; profileImage: string }).xId = token.xId as string;
      (session as Session & { handle: string; xId: string; profileImage: string }).profileImage = token.profileImage as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
