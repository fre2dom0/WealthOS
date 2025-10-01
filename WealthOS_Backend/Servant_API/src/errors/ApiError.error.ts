import type { ApiResponseCode } from "#types/response.type.js";
import { CODE_TO_STATUS } from "#types/error.type.js";

/**
 * Custom error class for API-related errors.
 * Ensures consistent error structure with a machine-readable code,
 * an HTTP status code, and an optional custom message.
 */
class ApiError extends Error {
    statusCode: number;
    code: ApiResponseCode;

    /**
     * Creates an ApiError instance.
     * 
     * @param message - Human-readable error message.
     * @param code - Machine-readable error code (defaults to 'SERVER_ERROR').
     * @param statusCode - Optional override for HTTP status code.
     *                     If not provided, inferred from `code`.
    */
    constructor(message: string, code: ApiResponseCode = 'SERVER_ERROR', statusCode?: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode ?? CODE_TO_STATUS[code];
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Ends the program
     */
    public static fatalError(err: unknown): never {
        console.error('❌ Fatal error occurred');
        if (err instanceof ApiError) console.error(err.message, err.code, err.stack);
        else console.error(err);
        process.exit(1);
    }
}

export default ApiError;

/**
    1xx Informational 	 
    100 	Continue
    101 	Switching protocols
    102 	Processing
    103 	Early Hints
        
    2xx Succesful 	 
    200 	OK
    201 	Created
    202 	Accepted
    203  	Non-Authoritative Information
    204 	No Content
    205 	Reset Content
    206 	Partial Content
    207 	Multi-Status
    208 	Already Reported
    226 	IM Used
        
    3xx Redirection 	 
    300 	Multiple Choices
    301 	Moved Permanently
    302 	Found (Previously "Moved Temporarily")
    303 	See Other
    304 	Not Modified
    305 	Use Proxy
    306 	Switch Proxy
    307 	Temporary Redirect
    308 	Permanent Redirect
        
    4xx Client Error 	 
    400 	Bad Request
    401 	Unauthorized
    402 	Payment Required
    403 	Forbidden
    404 	Not Found
    405 	Method Not Allowed
    406 	Not Acceptable
    407 	Proxy Authentication Required
    408 	Request Timeout
    409 	Conflict
    410 	Gone
    411 	Length Required
    412 	Precondition Failed
    413 	Payload Too Large
    414 	URI Too Long
    415 	Unsupported Media Type
    416 	Range Not Satisfiable
    417 	Expectation Failed
    418 	I'm a Teapot
    421 	Misdirected Request
    422 	Unprocessable Entity
    423 	Locked
    424 	Failed Dependency
    425 	Too Early
    426 	Upgrade Required
    428 	Precondition Required
    429 	Too Many Requests
    431 	Request Header Fields Too Large
    451 	Unavailable For Legal Reasons
        
    5xx Server Error 	 
    500 	Internal Server Error
    501 	Not Implemented
    502 	Bad Gateway
    503 	Service Unavailable
    504 	Gateway Timeout
    505 	HTTP Version Not Supported
    506 	Variant Also Negotiates
    507 	Insufficient Storage
    508 	Loop Detected
    510 	Not Extended
    511 	Network Authentication Required
*/