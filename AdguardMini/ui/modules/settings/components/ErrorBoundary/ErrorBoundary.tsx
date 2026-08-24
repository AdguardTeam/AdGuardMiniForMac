// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* eslint-disable no-console */

import { loggerColors, getFailedMethodNameFromError } from '@adg/webview-utils-kit';
import { Component } from 'preact';

import type { ComponentChildren } from 'preact';

type Props = { children: ComponentChildren };

const SOURCE_REF = 'this://app/app.js:';

const preprocessArgs = (color: string, args: any[]) => {
    return args.map((arg, i) => {
        let data = '';
        if (typeof arg === 'object') {
            data = JSON.stringify(arg);
        } else {
            data = String(arg);
        }
        if (i === 0) {
            data = `${color} ${data}`;
        }
        return data;
    });
};

const logRed = (...args: any[]) => {
    console.log(...preprocessArgs(`\n${loggerColors.bg.red}${loggerColors.text.white} LOG: ${loggerColors.reset}`, args));
};

const prepareError = (error: unknown): Error => {
    let preparedError: Error;
    if (!error) {
        preparedError = new Error('Unknown error');
    } else if (error instanceof Error) {
        preparedError = error;
    } else {
        preparedError = new Error(error as any);
    }

    preparedError.stack = preparedError.stack || '';
    const startIndex = preparedError.stack.indexOf(SOURCE_REF);
    const endIndex = preparedError.stack.indexOf(')', startIndex);
    preparedError.stack = `${preparedError.stack.substring(0, endIndex)}:1${preparedError.stack.substring(endIndex)}`;

    return preparedError;
};

/**
 * Global error boundary for all errors
 */
export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
    /**
     * Ctor
     */
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    /**
     * @inheritDoc
     */
    public static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount() {
        console.reportException = (error: unknown) => {
            const failedMethodName = error instanceof Error ? getFailedMethodNameFromError(error) : 'Unknown';

            if (DEV) {
                log.error(
                    'Some error apeared',
                    'reportException',
                    error?.toString() || JSON.stringify(error),
                    `failed method name: ${failedMethodName}`,
                );
            } else {
                const preparedError = prepareError(error);
                const { name, message, stack } = preparedError;
                log.error(`${name}: ${message}`, stack);
            }
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidCatch(error: Error) {
        if (DEV) {
            logRed(error.message, error.stack);
        } else {
            const preparedError = prepareError(error);
            const { name, message, stack } = preparedError;
            log.error(`${name}: ${message}`, stack);
        }
    }

    /**
     * @inheritDoc
     */
    public render() {
        const { hasError } = this.state;
        const { children } = this.props;

        if (hasError) {
            return (
                <div>{(this.state as any).error?.message}</div>
            );
        }

        return children;
    }
}
