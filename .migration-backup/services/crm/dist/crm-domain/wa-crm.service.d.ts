export interface CrmFeature {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}
export declare class WaCrmService {
    getFeatures(): CrmFeature[];
}
