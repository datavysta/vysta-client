export enum JobStatus {
  ENQUEUED = 'ENQUEUED',
  FAILED = 'FAILED',
  PROCESSING = 'PROCESSING',
  SCHEDULED = 'SCHEDULED',
  SUCCEEDED = 'SUCCEEDED',
  DELETED = 'DELETED',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  DEAD = 'DEAD',
}

export enum Aggregate {
  COUNT = 'COUNT',
  SUM = 'SUM',
  MIN = 'MIN',
  MAX = 'MAX',
  AVG = 'AVG',
}

export enum PasswordResetStatus {
  VALID = 0,
  EXPIRED = 1,
  NOT_FOUND = 2,
  INVALID_CODE = 3,
  COMPLETED = 4,
  PASSWORDS_MUST_MATCH = 5,
  PASSWORD_REUSED = 6,
}

export enum InvitationStatus {
  VALID = 0,
  EXPIRED = 1,
  NOT_FOUND = 2,
  ALREADY_ACCEPTED = 3,
}
