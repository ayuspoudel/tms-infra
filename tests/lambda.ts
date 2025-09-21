import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const client = new LambdaClient({ region: "us-east-1" });

async function invokeLambda() {
  const command = new InvokeCommand({
    FunctionName: "testlambdafunction",
    Payload: Buffer.from(JSON.stringify({ key: "value" })), // now recognized
  });

  const response = await client.send(command);

  console.log("StatusCode:", response.StatusCode);

  if (response.Payload) {
    const text = new TextDecoder("utf-8").decode(response.Payload);
    console.log("Payload:", text);
  }
}

invokeLambda().catch(console.error);
