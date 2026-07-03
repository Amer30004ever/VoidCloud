import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || 'missing',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'missing',
      callbackURL: `${process.env.BACKEND_URL || ''}/api/v1/cloud/auth/github/callback`,
      scope: ['user:email'],
    });
  }
  async validate(_at: string, _rt: string, profile: any) {
    const email = profile.emails?.[0]?.value;
    return {
      githubId: profile.id,
      email,
      name: profile.displayName || profile.username,
      avatar: profile.photos?.[0]?.value,
    };
  }
}
