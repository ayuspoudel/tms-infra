import * as aws from "@pulumi/aws";

// Configuration for the DynamoDB table
export interface TableConfig {
  name: string;
  attributes: aws.dynamodb.TableArgs["attributes"];
  hashKey: string;
  rangeKey?: string;
  billingMode?: string;
  tags?: { [key: string]: string };
}

// Configuration for each API Gateway endpoint
export interface EndpointConfig {
  pathPart: string;          // e.g. "tasks", "users"
  lambdaCodePath: string;    // folder path to the lambda code
}

// Full set of arguments for the component
export interface LambdaDynamoApiArgs {
  table: TableConfig;
  endpoints: EndpointConfig[];
  stageName?: string;        // optional API Gateway stage (default "dev")
}
