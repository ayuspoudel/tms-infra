import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

import { LambdaDynamoApi } from "./serverless-module"

const service = new LambdaDynamoApi("usertest", {
  table: {
    name: "UsersTable",
    attributes: [{ name: "id", type: "S" }],
    hashKey: "id",
  },
  endpoints: [
    { pathPart: "tasks", lambdaCodePath: "./lambda" },
  ],
  stageName: "dev",
});


export const apiUrl = service.apiUrl;
export const tableName = service.dynamodbTableName;
export const lambdas = service.lambdas;
