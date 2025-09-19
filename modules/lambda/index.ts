import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface LambdaOptions {
    /**
     * Deployment type: "s3" | "image" | "inline"
     */
    packageType?: "s3" | "image" | "inline";

    /**
     * S3 artifact config (required if packageType = "s3")
     */
    s3Bucket?: pulumi.Input<string>;
    s3Key?: pulumi.Input<string>;

    /**
     * Container image config (required if packageType = "image")
     */
    imageUri?: pulumi.Input<string>;

    /**
     * Inline code config (required if packageType = "inline")
     */
    code?: string; // plain string for inline handler code
    handler?: string;
    runtime?: aws.lambda.Runtime;

    /**
     * Environment variables
     */
    envVars?: Record<string, pulumi.Input<string>>;

    /**
     * Resources
     */
    memorySize?: number;
    timeout?: number;

    /**
     * Networking
     */
    vpcConfig?: aws.types.input.lambda.FunctionVpcConfig;

    /**
     * Layers
     */
    layers?: pulumi.Input<string>[];
}

/**
 * Create a reusable Lambda function.
 */
export function createLambdaFunction(
    name: string,
    role: aws.iam.Role,
    opts: LambdaOptions
): aws.lambda.Function {
    const baseConfig = {
        role: role.arn, // always required
        environment: { variables: opts.envVars || {} },
        timeout: opts.timeout ?? 10,
        memorySize: opts.memorySize ?? 256,
        vpcConfig: opts.vpcConfig,
        layers: opts.layers,
    };

    if (opts.packageType === "image") {
        if (!opts.imageUri) {
            throw new Error("imageUri is required when packageType is 'image'");
        }
        return new aws.lambda.Function(name, {
            packageType: "Image",
            imageUri: opts.imageUri,
            ...baseConfig,
        });
    }

    if (opts.packageType === "s3") {
        if (!opts.s3Bucket || !opts.s3Key) {
            throw new Error("s3Bucket and s3Key are required when packageType is 's3'");
        }
        return new aws.lambda.Function(name, {
            runtime: opts.runtime ?? "nodejs18.x",
            handler: opts.handler ?? "index.handler",
            s3Bucket: opts.s3Bucket,
            s3Key: opts.s3Key,
            ...baseConfig,
        });
    }

    // Inline fallback (good for tests/small utils)
    return new aws.lambda.Function(name, {
        runtime: opts.runtime ?? "nodejs18.x",
        handler: opts.handler ?? "index.handler",
        code: new pulumi.asset.AssetArchive({
            ".": new pulumi.asset.StringAsset(
                opts.code ??
                    "exports.handler = async () => ({ statusCode: 200, body: 'Hello from inline Lambda' });"
            ),
        }),
        ...baseConfig,
    });
}

/**
 * Allow API Gateway to invoke the Lambda
 */
export function allowApiGatewayInvoke(
    lambdaFn: aws.lambda.Function,
    logicalName: string
) {
    return new aws.lambda.Permission(`${logicalName}-invoke-permission`, {
        action: "lambda:InvokeFunction",
        function: lambdaFn.name,
        principal: "apigateway.amazonaws.com",
    });
}
