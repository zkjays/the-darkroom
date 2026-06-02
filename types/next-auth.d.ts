import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    handle: string;
    xId: string;
    profileImage: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    handle: string;
    xId: string;
    profileImage: string;
    accessToken?: unknown;
    accessSecret?: unknown;
  }
}
