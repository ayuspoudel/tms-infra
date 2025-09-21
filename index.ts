import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

const lambdacode = new pulumi.asset.AssetArchive({
    "index.js": new pulumi.asset.StringAsset(`
        exports.handler = async function(event){
        console.log("Event: ", event);
        return {
            statusCode: 200,
            body: JSON.stringify({message: "Hello from inline lambda"}),
        };

        }
        `),
})

const role = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});

new aws.iam.RolePolicyAttachment("lambdaBasicExec", {
  role: role.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});


const testlambdafunction = new aws.lambda.Function("testlambdafunction", {
    code: lambdacode,
    name: "testlambdafunction",
    handler: "index.handler",
    role: role.arn,
    runtime: "nodejs18.x",
    timeout: 30,
    memorySize: 128,
    publish: true,
    environment: {
        variables: {    
            ENV_VAR: "value",
        },
    
    },
    architectures: ["arm64"],
})

const api = new aws.apigateway.RestApi("testApi", {
    name: "testApi",
})

const resource = new aws.apigateway.Resource("testResource", {
    restApi: api.id,
    parentId: api.rootResourceId,
    pathPart: "test",
})

const method = new aws.apigateway.Method("testMethod", {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: "GET",
    authorization: "NONE"
})

const integration = new aws.apigateway.Integration("testIntegration", {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: method.httpMethod,
    integrationHttpMethod: "POST",
    type: "AWS_PROXY",
    uri: testlambdafunction.invokeArn,
})

const deployment = new aws.apigateway.Deployment("testDeployment", {
    restApi: api.id,
}, { dependsOn: [integration] });

const stage = new aws.apigateway.Stage("teststage",{
    restApi: api.id,
    deployment: deployment.id,
    stageName: "test",
})

new aws.lambda.Permission("apiGatewayInvoke", {
  action: "lambda:InvokeFunction",
  function: testlambdafunction.name,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
});

const testdynamodbtable = new aws.dynamodb.Table ("testdynamodbtable", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    billingMode: "PAY_PER_REQUEST",
    name: "testdynamodbtable",
    tags: {
        Environment: "dev",
    }
})

export const apiUrl = pulumi.interpolate`${stage.invokeUrl}`;
export const lambdaName = testlambdafunction.name;
export const dynamodbtableName = testdynamodbtable.name;
