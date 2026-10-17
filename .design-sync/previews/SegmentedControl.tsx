import { SegmentedControl } from '@prizy/ui';

export const DigestFrequency = () => (
    <SegmentedControl
        options={[
            { label: 'Off', value: 'off' },
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
        ]}
        value="daily"
        onChange={() => {}}
    />
);

export const ReportRange = () => (
    <SegmentedControl
        options={[
            { label: '7 days', value: '7d' },
            { label: '30 days', value: '30d' },
            { label: '90 days', value: '90d' },
        ]}
        value="30d"
        onChange={() => {}}
    />
);

export const ListOrBoard = () => (
    <SegmentedControl
        options={[
            { label: 'List', value: 'list' },
            { label: 'Board', value: 'board' },
        ]}
        value="list"
        onChange={() => {}}
    />
);
