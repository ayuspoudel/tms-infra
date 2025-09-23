import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { LambdaDynamoApiArgs, TableConfig, EndpointConfig } from "./types";

export class LambdaDynamoApi extends pulumi.ComponentResource {
  public readonly apiUrl: pulumi.Output<string>;
  public readonly dynamodbTables: { [key: string]: pulumi.Output<string> };
  public readonly lambdas: pulumi.Output<string>[];

  constructor(
    name: string,
    args: LambdaDynamoApiArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("custom:infra:LambdaDynamoApi", name, {}, opts);

    const stageName = args.stageName ?? "dev";
    this.dynamodbTables = {};
    const role = new aws.iam.Role(
      `${name}-lambdaRole`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
      },
      { parent: this }
    );

    new aws.iam.RolePolicyAttachment(
      `${name}-basicExec`,
      {
        role: role.name,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      },
      { parent: this }
    );

    const tables: { [key: string]: aws.dynamodb.Table } = {};
    if (args.tables && args.tables.length > 0) {
      for (const tbl of args.tables) {
        const table = new aws.dynamodb.Table(
          `${name}-${tbl.name}`,
          {
            attributes: tbl.attributes,
            hashKey: tbl.hashKey,
            rangeKey: tbl.rangeKey,
            billingMode: tbl.billingMode ?? "PAY_PER_REQUEST",
            name: tbl.name,
            tags: tbl.tags ?? { Environment: pulumi.getStack() },
          },
          { parent: this }
        );
        tables[tbl.name] = table;
        this.dynamodbTables[tbl.name] = table.name;

        new aws.iam.RolePolicy(
          `${name}-${tbl.name}-policy`,
          {
            role: role.id,
            policy: pulumi.interpolate`{
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Scan",
                    "dynamodb:Query"
                  ],
                  "Resource": "${table.arn}"
                }
              ]
            }`,
          },
          { parent: this }
        );
      }
    }

    const api = new aws.apigateway.RestApi(`${name}-api`, {}, { parent: this });

    const lambdaNames: pulumi.Output<string>[] = [];
    const integrationsArray: aws.apigateway.Integration[] = [];

    for (const endpoint of args.endpoints) {
      const lambda = new aws.lambda.Function(
        `${name}-${endpoint.pathPart}-lambda`,
        {
        code:
          endpoint.s3Bucket && endpoint.s3Key
            ? pulumi
                .all([endpoint.s3Bucket, endpoint.s3Key])
                .apply(([bucket, key]) => new pulumi.asset.RemoteAsset(`s3://${bucket}/${key}`))
            : new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive(endpoint.lambdaCodePath ?? "."),
              }),

          handler: endpoint.handler ?? "index.handler",
          runtime: endpoint.runtime ?? "nodejs18.x",
          role: role.arn,
          timeout: endpoint.timeout ?? 30,
          memorySize: endpoint.memorySize ?? 128,
          architectures: endpoint.architectures ?? ["arm64"],
          environment: {
            variables: {
              ...endpoint.environment,
              ...Object.fromEntries(
                Object.entries(tables).map(([tname, table]) => [
                  `${tname.toUpperCase().replace(/-/g, "_")}_TABLE_NAME`,
                  table.name,
                ])
              ),
            },
          },
        },
        { parent: this }
      );

      lambdaNames.push(lambda.name);

      const resource = new aws.apigateway.Resource(
        `${name}-${endpoint.pathPart}-resource`,
        {
          restApi: api.id,
          parentId: api.rootResourceId,
          pathPart: endpoint.pathPart,
        },
        { parent: this }
      );

      const method = new aws.apigateway.Method(
        `${name}-${endpoint.pathPart}-method`,
        {
          restApi: api.id,
          resourceId: resource.id,
          httpMethod: "ANY",
          authorization: "NONE",
        },
        { parent: this }
      );

      const integration = new aws.apigateway.Integration(
        `${name}-${endpoint.pathPart}-integration`,
        {
          restApi: api.id,
          resourceId: resource.id,
          httpMethod: method.httpMethod,
          integrationHttpMethod: "POST",
          type: "AWS_PROXY",
          uri: lambda.invokeArn,
        },
        { parent: this }
      );

      integrationsArray.push(integration);

      new aws.lambda.Permission(
        `${name}-${endpoint.pathPart}-perm`,
        {
          action: "lambda:InvokeFunction",
          function: lambda.name,
          principal: "apigateway.amazonaws.com",
          sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
        },
        { parent: this }
      );
    }

    const deployment = new aws.apigateway.Deployment(
      `${name}-deployment`,
      {
        restApi: api.id,
      },
      { parent: this, dependsOn: integrationsArray }
    );

    const stage = new aws.apigateway.Stage(
      `${name}-stage`,
      {
        restApi: api.id,
        deployment: deployment.id,
        stageName,
      },
      { parent: this }
    );

    this.apiUrl = pulumi.interpolate`https://${api.id}.execute-api.${aws.config.region}.amazonaws.com/${stage.stageName}`;
    this.lambdas = lambdaNames;

    this.registerOutputs({
      apiUrl: this.apiUrl,
      dynamodbTables: this.dynamodbTables,
      lambdas: this.lambdas,
    });
  }
}
