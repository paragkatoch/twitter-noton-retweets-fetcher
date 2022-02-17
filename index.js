require("dotenv").config();

const express = require("express");
const app = express();
const port = 3000;

const axios = require("axios");
const { writeToFile } = require("./helper");
const { getAllData, sendAllData } = require("./notion");

app.get("/", async (req, res) => {
	const tweetId = process.env.TWEET_ID;
	const twitterData = await getAllTweets(tweetId);
	const [uniqueTwitterData, _] = filterUniqueRecords(twitterData);

	const notionData = await getAllData(process.env.NOTION_DB_ID);
	const uniqueRetweets = removeDuplicateRecords(uniqueTwitterData, notionData);

	let formattedData = [];
	if (uniqueRetweets.length > 0) {
		const parent = {
			database_id: process.env.NOTION_DB_ID,
		};

		formattedData = formatTwitterDataToUsernameDb(uniqueRetweets, parent);
		console.log("Sending unique data to email db");

		await sendAllData(formattedData);
	} else {
		console.log("No unique records found, aborting...");
	}

	writeToFile(
		{
			twitterData,
			uniqueTwitterData,
			notionData,
			uniqueRetweets,
			formattedData,
		},
		"data.json"
	);

	console.log("--- end ---");
	res.send("done");
});

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});

function filterUniqueRecords(data) {
	let seen = Object.create(null);
	let out = [];
	let duplicates = [];

	let j = 0;
	let d = 0;

	for (let i = 0; i < data.length; i++) {
		let { id } = data[i];
		if (seen[id] !== 1) {
			seen[id] = 1;
			out[j++] = data[i];
		} else {
			duplicates[d++] = data[i];
		}
	}

	console.log("unique retweets:", out.length);
	console.log("duplicate retweets:", duplicates.length);

	return [out, duplicates];
}

async function getAllTweets(tweetId) {
	let data = [];
	let stop = false;
	let nextToken = null;

	while (!stop) {
		const reqConfig = {
			headers: {
				authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
				"User-Agent": "v2RetweetedByUsersJS",
			},
			params: {
				pagination_token: nextToken,
			},
		};

		try {
			const response = await axios.get(
				`https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`,
				reqConfig
			);

			if (response?.data?.data !== undefined) {
				data = [...data, ...response?.data?.data];
			}

			if (response?.data?.meta?.next_token !== undefined) {
				nextToken = response.data.meta.next_token;
			} else {
				stop = true;
			}
		} catch (error) {
			console.log("error", error);
			break;
		}
	}

	console.log("total retweets arrvied", data.length);
	return data;
}

function removeDuplicateRecords(unknownData, dbData) {
	console.log("removing duplicate data...");

	const seen = Object.create(null);
	const out = [];

	// formatted notion username db data
	for (let i = 0; i < dbData.length; i++) {
		let id = dbData[i].properties["id"].rich_text[0].text.content;
		seen[id] = 1;
	}

	// unformatted twitter data
	let j = 0;
	for (let i = 0; i < unknownData.length; i++) {
		const id = unknownData[i].id;
		if (seen[id] !== 1) {
			seen[id] = 1;
			out[j++] = unknownData[i];
		}
	}

	console.log("done\n");
	console.log("new unique records ", out.length);
	console.log("duplicate records ", unknownData.length - out.length);
	console.log("\n");

	return out;
}

function formatTwitterDataToUsernameDb(data, parent) {
	console.log("formatting data...");

	const finalData = data.map((item) => {
		const { id, name, username } = item;

		return {
			parent,
			properties: {
				Username: {
					rich_text: [{ type: "text", text: { content: username } }],
				},
				id: {
					rich_text: [{ type: "text", text: { content: id } }],
				},
				Name: {
					title: [
						{
							text: {
								content: name,
							},
						},
					],
				},
			},
		};
	});

	console.log("done\n");
	return finalData;
}
