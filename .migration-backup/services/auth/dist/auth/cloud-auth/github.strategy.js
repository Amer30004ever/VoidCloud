"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_github2_1 = require("passport-github2");
let GitHubStrategy = class GitHubStrategy extends (0, passport_1.PassportStrategy)(passport_github2_1.Strategy, 'github') {
    constructor() {
        super({
            clientID: process.env.GITHUB_CLIENT_ID || 'missing',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || 'missing',
            callbackURL: `${process.env.BACKEND_URL || ''}/api/v1/cloud/auth/github/callback`,
            scope: ['user:email'],
        });
    }
    async validate(_at, _rt, profile) {
        const email = profile.emails?.[0]?.value;
        return {
            githubId: profile.id,
            email,
            name: profile.displayName || profile.username,
            avatar: profile.photos?.[0]?.value,
        };
    }
};
exports.GitHubStrategy = GitHubStrategy;
exports.GitHubStrategy = GitHubStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GitHubStrategy);
//# sourceMappingURL=github.strategy.js.map