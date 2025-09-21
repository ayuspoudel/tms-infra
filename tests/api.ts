import fetch from "node-fetch";

const apiUrl = "https://23r784zrb2.execute-api.us-east-1.amazonaws.com/test/test"

async function testApi() {
    try{
        const response = await fetch(apiUrl, {
            method: "GET",
        });
        console.log("Status Code: ", response.status);
        const body = await response.text();
        console.log("Body: ", body)
    }
    catch(error){
        console.error("Error Calling API", error);
    }
}

testApi();