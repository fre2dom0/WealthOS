export type ApiResponseCode = 'SUCCESS' | 'SERVER_ERROR' | 'BAD_REQUEST' | 'SESSION_FOUND' | 'NO_SESSION' | 'UNAUTHORIZED' | 'TOO_MANY_REQUEST';

export type ApiResponse = {
    data?: any;
    message: string;
    code: ApiResponseCode
}