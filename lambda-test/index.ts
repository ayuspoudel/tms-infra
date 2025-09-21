import * as aws from "@pulumi/aws";
import { createLambdaFunction } from "tms-infra/modules/lambda";

// IAM role for the test Lambda
const lambdaRole = new aws.iam.Role("test-lambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
    }),
});

// Attach AWS-managed execution policy (writes logs to CloudWatch)
new aws.iam.RolePolicyAttachment("test-lambda-basic-execution", {
    role: lambdaRole,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// Create a simple inline Hello World Lambda
const helloLambda = createLambdaFunction("hello-world-lambda", lambdaRole, {
    packageType: "inline",
    code: `
        exports.handler = async (event) => {
            console.log("Lambda Event:", JSON.stringify(event, null, 2));
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Hello from reusable Lambda module!" }),
            };
        };
    `,
});

// Export the ARN so we can test with AWS CLI
export const lambdaArn = helloLambda.arn;
