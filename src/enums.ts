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