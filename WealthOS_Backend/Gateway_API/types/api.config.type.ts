export type NodeEnv = 'development' | 'stage' | 'production';
export type DeployType = 'local' | 'deployment';

export interface ApiConfig {
    is_test: boolean,
    node_env: NodeEnv; 
    deploy_type: DeployType;
    domain: string;
    port: number;
    allowed_origins: string[];
}