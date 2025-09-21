import {DynamoDBClient, PutItemCommand, GetItemCommand} from "@aws-sdk/client-dynamodb"

const client = new DynamoDBClient({region: "us-east-1"});
const tableName = "testdynamodbtable";

const testId = "124";
async function putItemtest(){
    const id = testId;
    const putcmd = new PutItemCommand({
        TableName: tableName,
        Item: {
            id: {S: id},
            message: {S: "Hello from Ayush Pulumi Dynamo Test"},
        }
    });
    const result = await client.send(putcmd);
    console.log(`Inserted Item with id=${id}`)
}

async function getItemstest(){
    const getcmd = new GetItemCommand({
        TableName: tableName,
        Key:{
            id: {S: testId},
        }
    })
    const result = await client.send(getcmd);
    console.log("Read back item:", result.Item)
}

async function testdynamodbtable() {
    await putItemtest();
    await getItemstest();
};

testdynamodbtable();