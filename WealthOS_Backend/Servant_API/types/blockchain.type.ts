export type EventName = 'Approved' | 'Revoked' | 'Executed';

export type ApprovedEvent = {
    user: `0x${string}`;
    selector: string[];
    time: bigint;
}

export type RevokedEvent = {
    user: `0x${string}`;
    selector: string[];
    time: bigint;
}

export type ExecutedEvent = {
    user: `0x${string}`;
    module: `0x${string}`;
    data: string;
}

export type EventArgsMap = {
    Approved: ApprovedEvent;
    Revoked: RevokedEvent;
    Executed: ExecutedEvent;
};