declare const GitHubStrategy_base: new (...args: any) => any;
export declare class GitHubStrategy extends GitHubStrategy_base {
    constructor();
    validate(_at: string, _rt: string, profile: any): Promise<{
        githubId: any;
        email: any;
        name: any;
        avatar: any;
    }>;
}
export {};
