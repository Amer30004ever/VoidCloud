import { WaCrmService } from './wa-crm.service';
export declare class WaCrmController {
    private waCrm;
    constructor(waCrm: WaCrmService);
    getFeatures(): import("./wa-crm.service").CrmFeature[];
}
