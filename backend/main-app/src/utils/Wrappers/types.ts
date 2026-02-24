export interface ParamMeta {
  name: string;
  type: string;          
  rows?: number;
  cols?: number;
}
 
export interface WrapOptions {
  language: string;
  userCode: string;       
  signature: string;      
  functionName: string;
  testCases: Array<{
    input: any;
    expectedOutput?: any;
    isHidden?: boolean;
  }>;
 
}