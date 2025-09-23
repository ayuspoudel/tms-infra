import * as aws from "@pulumi/aws";

export interface TableConfig {
  name: string;
  attributes: aws.dynamodb.TableArgs["attributes"];
  hashKey: string;
  rangeKey?: string;
  billingMode?: string;
  tags?: { [key: string]: string };
}

export interface EndpointConfig {
  pathPart: string;
  lambdaCodePath?: string;
  s3Bucket?: string;
  s3Key?: string;
  handler?: string;
  runtime?: string;
  timeout?: number;
  memorySize?: number;
  architectures?: string[];
  environment?: { [key: string]: string };
}

export interface LambdaDynamoApiArgs {
  tables?: TableConfig[];
  endpoints: EndpointConfig[];
  stageName?: string;
}
