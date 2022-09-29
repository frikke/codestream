"use strict";

export const APIServerVersionInfo = {
	// this is the minimum API server version required to run
	// this version of the CodeStream plugin, if an earlier API
	// server version is detected, the plugin won't run at all
	minimumRequired: "1.21.0",

	// this is the minimum "preferred" API server version,
	// if an earlier API server version is detected, the user
	// will be recommended to get their admin to install a
	// newer version
	minimumPreferred: "1.21.11",

	// this enumerates the capabilities that are available if
	// the admin installs a newer version of the API server ...
	// so if the plugin detects an API server version older
	// than the version associated with features listed here,
	// the user will be alerted to the features they are
	// missing out on
	preferredCapabilities: {
		sample: {
			description: "SAMPLE",
			url: "http://path.to.blog.describing.feature",
			version: "1.0.0",
		},

		// add new features here, following the template above
		// the hash key is the agreed-upon tag name, and must
		// agree with the capabilities offered by the API server
		// the description will be shown to the user, along with
		// an optional url to a blog page where they can read
		// more about the feature
	},
};
