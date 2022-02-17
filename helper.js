const fs = require("fs");

module.exports = {
	writeToFile: (data, fileName) => {
		console.log("logging data to ", fileName, "\n");

		fs.writeFile(
			__dirname + "/log/" + fileName,
			JSON.stringify(data, null, 4),
			(err) => {
				if (err) {
					console.error(err);
					return;
				}
			}
		);
	},
};
