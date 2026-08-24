/**
 * Type representing an action in the tray menu.
 */
export type Action = {
    id: number;
    type: 'action';
    name: string;
    onClick: () => void;
} | {
    id: number;
    type: 'separator';
};
