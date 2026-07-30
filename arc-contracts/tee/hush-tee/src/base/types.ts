export interface ExtensionInfo {
  name: string;
  version: string;
  supportedMethods: Array<{ op_type: string; op_command: string }>;
}

export interface HealthCheckResult {
  status: 'ok' | 'error';
  uptime: number;
  extension: ExtensionInfo;
}
