import { CompilerConfig } from '@ton-ai-core/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/test.tact',
    options: {
        debug: true,
    },
};
