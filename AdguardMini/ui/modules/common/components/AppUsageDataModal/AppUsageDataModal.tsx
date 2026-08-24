// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import theme from 'Theme';
import { ExternalLink, Modal, Text } from 'UILib';

import s from './AppUsageDataModal.module.pcss';

type AppUsageDataModalProps = {
    onClose(): void;
};

/**
 * App usage data modal
 */
export function AppUsageDataModal({
    onClose,
}: AppUsageDataModalProps) {
    return (
        <Modal
            submitAction={onClose}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('close')}
            title={translate('telemetry.modal.title')}
            submit
            onClose={onClose}
        >
            <div className={s.AppUsageDataModal_content}>
                <Text className={s.AppUsageDataModal_content_margin} type="t1">{translate('telemetry.modal.text.1')}</Text>
                <ul className={cx(s.AppUsageDataModal_content_list, s.AppUsageDataModal_content_margin)}>
                    <li><Text type="t1">{translate('telemetry.modal.text.2')}</Text></li>
                    <li><Text type="t1">{translate('telemetry.modal.text.3')}</Text></li>
                    <li><Text type="t1">{translate('telemetry.modal.text.4')}</Text></li>
                </ul>
                <Text className={s.AppUsageDataModal_content_margin} type="t1">{translate('telemetry.modal.text.5')}</Text>
                <Text className={s.AppUsageDataModal_content_margin} type="t1">{translate('telemetry.modal.text.6')}</Text>
                <Text type="t1">{translate('telemetry.modal.text.7')}</Text>
                <Text className={s.AppUsageDataModal_content_margin} type="t1">{translate('telemetry.modal.text.8')}</Text>
                <ExternalLink href={getTdsLink(TDS_PARAMS.privacy)} textType="t1" noUnderline>{translate('about.privacy')}</ExternalLink>
            </div>
        </Modal>
    );
}
