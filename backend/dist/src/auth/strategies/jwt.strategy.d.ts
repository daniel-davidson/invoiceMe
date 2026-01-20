import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly logger;
    constructor(configService: ConfigService);
    validate(payload: any): Promise<{
        sub: any;
        tenantId: any;
        email: any;
        role: any;
        aud: any;
    }>;
}
export {};
