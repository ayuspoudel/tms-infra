import * as aws from "@pulumi/aws";
import { createLambdaFunction } from "../modules/lambda";

// IAM role
const lambdaRole = new aws.iam.Role("test-lambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});
new aws.iam.RolePolicyAttachment("test-lambda-basic-execution", {
    role: lambdaRole,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// Inline Lambda code
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

export const lambdaArn = helloLambda.arn;
