// TODO: this needs to be move to a build time operation or something

const data = require("./icons8-data.json");

// Returns a string representation of html attributes
function getHtmlAttributes(icon, options) {
	var attributes = [];
	var attrObj = Object.assign({}, icon.options, options);

	// If the user passed in options
	if (options) {
		// If any of the width or height is passed in
		if (options["width"] || options["height"]) {
			attrObj["width"] = options["width"]
				? options["width"]
				: (parseInt(options["height"]) * icon.options["width"]) / icon.options["height"];
			attrObj["height"] = options["height"]
				? options["height"]
				: (parseInt(options["width"]) * icon.options["height"]) / icon.options["width"];
		}

		// If the user passed in class
		if (options["class"]) {
			attrObj["class"] = "octicon octicon-" + key + " " + options["class"];
			attrObj["class"].trim();
		}

		// If the user passed in aria-label
		if (options["aria-label"]) {
			attrObj["aria-label"] = options["aria-label"];
			attrObj["role"] = "img";

			// Un-hide the icon
			delete attrObj["aria-hidden"];
		}
	}

	for (const [option, value] of Object.entries(attrObj)) {
		attributes.push(`${option}="${value}"`);
	}

	return attributes.join(" ").trim();
}

for (const [key, icon] of Object.entries(data)) {
	// Set the symbol for easy access
	icon.symbol = key;

	const width = icon.width || 16;
	const height = icon.height || 16;

	// Set all the default options
	icon.options = {
		version: "1.1",
		width,
		height,
		class: "octicon octicon-" + key,
		"aria-hidden": "true",
	};
	icon.options.viewBox = icon.viewBox || "0 0 " + width + " " + height;

	// Function to return an SVG object
	icon.toSVG = function (options) {
		return `<svg ${getHtmlAttributes(icon, options)}>${icon.path}</svg>`;
	};
}

// Import data into exports
export default data;
