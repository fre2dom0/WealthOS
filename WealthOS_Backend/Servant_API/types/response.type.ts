export type ApiResponseCode = 'SUCCESS' | 'DATABASE_ERROR'| 'SERVER_ERROR' | 'BAD_REQUEST' | 'SESSION_FOUND' | 'NO_SESSION' | 'UNAUTHORIZED' | 'TOO_MANY_REQUEST';

export type ApiResponse = {
    data?: any;
    message: string;
    code: ApiResponseCode
}