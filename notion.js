const { Client } = require("@notionhq/client");

const notion = new Client({
	auth: process.env.NOTION_AUTH_SECRET,
});

const sendAllData = async (data) => {
	console.log("sending", data.length, "records...");

	const response = await Promise.all(
		data.map(async (item) => await notion.pages.create(item))
	);

	console.log("done\n");
};

const getAllData = async (id) => {
	console.log("fetching records from database", id, "...");

	let nextCustor = undefined;
	let data = [];

	while (true) {
		const response = await notion.databases.query({
			database_id: id,
			start_cursor: nextCustor,
		});

		data = [...data, ...response.results];

		if (!response?.has_more) {
			break;
		} else {
			nextCustor = response.next_cursor;
		}
	}

	console.log("done\n");
	return data;
};

module.exports = {
	notion,
	getAllData,
	sendAllData,
};
