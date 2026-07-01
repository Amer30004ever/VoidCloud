export declare function vpsReadyEmail(opts: {
    name: string;
    vpsName: string;
    ipv4: string;
    rootPassword?: string;
    dashboardUrl: string;
}): {
    html: string;
    text: string;
};
