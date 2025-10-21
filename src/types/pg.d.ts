declare module 'pg' {
  // Minimal subset used by tests
  export class Client {
    constructor(opts: any);
    connect(): Promise<void>;
    query(sql: string): Promise<any>;
    end(): Promise<void>;
  }
}
