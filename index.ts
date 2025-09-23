import * as pulumi from "@pulumi/pulumi";
import { LambdaDynamoApi } from "./serverless-module";

const service = new LambdaDynamoApi("usertest", {
  tables: [
    {
      name: "UsersTable",
      attributes: [
        { name: "id", type: "S" },
        { name: "email", type: "S" },
      ],
      hashKey: "id",
      billingMode: "PAY_PER_REQUEST",
      globalSecondaryIndexes: [
        {
          name: "email-index",
          hashKey: "email",
          projectionType: "ALL",
        },
      ],
    },
    {
      name: "UserSessionsTable",
      attributes: [
        { name: "id", type: "S" },
        { name: "refreshToken", type: "S" },
        { name: "userId", type: "S" },
      ],
      hashKey: "id",
      billingMode: "PAY_PER_REQUEST",
      globalSecondaryIndexes: [
        {
          name: "refreshToken-index",
          hashKey: "refreshToken",
          projectionType: "ALL",
        },
        {
          name: "userId-index",
          hashKey: "userId",
          projectionType: "ALL",
        },
      ],
      ttl: { attributeName: "expiresAt", enabled: true },
    },
  ],
  endpoints: [
    {
      pathPart: "auth",
      lambdaCodePath: "s3://tms-msdeploy-lambda-code-bucket-2f7e7c7/user-service-latest.zip",
    },
  ],
  stageName: "dev",
});

export const apiUrl = service.apiUrl;
export const dynamoTables = service.dynamodbTables;
export const lambdas = service.lambdas;
