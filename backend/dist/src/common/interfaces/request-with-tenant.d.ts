import { Request } from 'express';
export interface RequestWithTenant extends Request {
    tenantId: string;
    user?: {
        sub: string;
        email?: string;
        [key: string]: any;
    };
}
