import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing',
      callbackURL: `${process.env.BACKEND_URL || ''}/api/v1/cloud/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }
  async validate(_at: string, _rt: string, profile: any, done: VerifyCallback) {
    done(null, {
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value,
    });
  }
}
