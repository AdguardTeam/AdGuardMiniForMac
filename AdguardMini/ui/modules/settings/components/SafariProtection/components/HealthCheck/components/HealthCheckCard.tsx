// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Button, Icon, Text } from 'Modules/common/components';
import theme from 'Theme';

import s from './HealthCheckCard.module.pcss';

import type { JSX } from 'preact/jsx-runtime';

/**
 * Props for the HealthCheckCard component.
 * @param title - Card title text
 * @param description - Card description content (JSX element)
 * @param cta - Array of call-to-action buttons with label and click handler
 * @param color - Card color scheme: 'orange' for warning issues, 'neutral' for regular alerts
 * @param onClose - Optional callback when the close button is clicked (makes close button visible when provided)
 */
type HealthCheckCardProps = {
    title: string;
    description: JSX.Element;
    cta: {
        label: string;
        onClick(): void;
    }[];
    color: 'orange' | 'neutral';
    onClose?(): void;
};

/**
 * Reusable health check card component that displays an issue and possible solutions.
 * Shows title, description, action buttons, and optional close button.
 * Uses orange color for warning-level issues and neutral for informational alerts.
 * @param props - Component props
 */
export function HealthCheckCard({ title, description, cta, onClose, color }: HealthCheckCardProps) {
    return (
        <div className={cx(s.HealthCheckCard, s[`HealthCheckCard__${color}`])}>
            <div className={s.HealthCheckCard_icon}>
                <Icon className={cx(s[`HealthCheckCard_icon__${color}`])} icon="info" />
            </div>
            <div className={s.HealthCheckCard_content}>
                <div className={s.HealthCheckCard_content_title}>
                    <Text type="t1">{title}</Text>
                </div>
                <div className={s.HealthCheckCard_content_desc}>
                    {description}
                </div>
                <div className={s.HealthCheckCard_content_cta}>
                    {cta.map(({ label, onClick }, index) => (
                        <Button key={index} className={cx(s.HealthCheckCard_content_cta_button, color === 'orange' && theme.button.orangeText)} type="text" onClick={onClick}>
                            <Text type="t2">{label}</Text>
                        </Button>
                    ))}
                </div>
            </div>
            {onClose && (
                <Button className={s.HealthCheckCard_close} icon="cross" type="icon" onClick={onClose} />
            )}
        </div>
    );
}
