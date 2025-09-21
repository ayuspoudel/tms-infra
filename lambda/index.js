const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");


const client = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = process.env.TABLE_NAME;

const additem = async function (event) {
    const body = JSON.parse(event.body || "{}");
    if (!body.id) {
        return { statusCode: 400, body: "Missing 'id'" };
    }
    await client.send(
        new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
                id: { S: body.id },
                message: { S: body.message || "default message" },
                createdAt: { S: new Date().toISOString() }
            }
        })
    );
    return { statusCode: 200, body: "Item created" };
};

const getitem = async function (event) {
    if (event.queryStringParameters?.id) {
        const id = event.queryStringParameters.id;
        const result = await client.send(
            new GetItemCommand({
                TableName: TABLE_NAME,
                Key: { id: { S: id } }
            })
        );
        return { statusCode: 200, body: JSON.stringify(result.Item || {}) };
    } else {
        const result = await client.send(
            new ScanCommand({
                TableName: TABLE_NAME
            })
        );
        return { statusCode: 200, body: JSON.stringify(result.Items || []) };
    }
};

const updateItem = async function (event) {
    const body = JSON.parse(event.body || "{}");
    if (!body.id || !body.message) {
        return { statusCode: 400, body: "Missing 'id' or 'message'" };
    }

    await client.send(
        new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: { id: { S: body.id } },
            UpdateExpression: "SET message = :msg",
            ExpressionAttributeValues: { ":msg": { S: body.message } }
        })
    );

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Item replaced", id: body.id })
    };
};

const patchItem = async function (event) {
  const body = JSON.parse(event.body || "{}");
  if (!body.id || !body.append) {
    return { statusCode: 400, body: "Missing 'id' or 'append'" };
  }

  await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { id: { S: body.id } },
      UpdateExpression: "SET message = message + :extra",
      ExpressionAttributeValues: { ":extra": { S: body.append } }
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Item patched", id: body.id })
  };
};


const deleteItem = async function (event) {
    if (!event.queryStringParameters?.id) {
        return { statusCode: 400, body: "Missing 'id'" };
    }

    await client.send(
        new DeleteItemCommand({
            TableName: TABLE_NAME,
            Key: { id: { S: event.queryStringParameters.id } }
        })
    );

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Item deleted",
            id: event.queryStringParameters.id
        })
    };
};

exports.handler = async function (event) {
    console.log("Event: ", event);
    try {
        const method = event.httpMethod;

        if (method === "POST") {
            return await additem(event);
        }

        if (method === "GET") {
            return await getitem(event);
        }

        if (method === "PUT") {
            return await updateItem(event);
        }

        if (method === "PATCH") {
            return await patchItem(event);
        }

        if (method === "DELETE") {
            return await deleteItem(event);
        }

        return { statusCode: 405, body: "Method Not Allowed" };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};