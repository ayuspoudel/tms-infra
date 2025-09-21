import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const client = new LambdaClient({ region: "us-east-1" });

async function invokeLambda(payload: any) {
  const command = new InvokeCommand({
    FunctionName: "testlambdafunction",
    Payload: Buffer.from(JSON.stringify(payload)), 
  });

  const response = await client.send(command);

  const text = response.Payload
    ? new TextDecoder("utf-8").decode(response.Payload)
    : null;

  console.log(`${payload.httpMethod} Response:`);
  console.log("StatusCode:", response.StatusCode);
  console.log("Payload:", text, "\n");
}

async function testallmethods(){
  const testId = "lambda-test-1";

  // POST - Create
  await invokeLambda({
    httpMethod: "POST",
    body: JSON.stringify({ id: testId, message: "hello world" }),
  });

  // GET - Single item
  await invokeLambda({
    httpMethod: "GET",
    queryStringParameters: { id: testId },
  });

  // PUT - Replace
  await invokeLambda({
    httpMethod: "PUT",
    body: JSON.stringify({ id: testId, message: "new content" }),
  });

  // PATCH - Partial update
  await invokeLambda({
    httpMethod: "PATCH",
    body: JSON.stringify({ id: testId, append: " more text" }),
  });

  // GET - All items
  await invokeLambda({
    httpMethod: "GET",
  });

  // DELETE - Remove
  await invokeLambda({
    httpMethod: "DELETE",
    queryStringParameters: { id: testId },
  });
}

testallmethods().catch(console.error);
