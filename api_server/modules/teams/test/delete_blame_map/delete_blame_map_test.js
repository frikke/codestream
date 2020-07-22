// provide a base class for most tests of the "POST /add-blame-map/:teamId" request

'use strict';

const Aggregation = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/aggregation');
const CodeStreamAPITest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/test_base/codestream_api_test');
const Assert = require('assert');
const CommonInit = require('./common_init');

class DeleteBlameMapTest extends Aggregation(CodeStreamAPITest, CommonInit) {

	get description () {
		return 'should remove a blame map entry and respond with appropriate directive when removing a blame map entry for a given email';
	}

	get method () {
		return 'put';
	}

	// before the test runs...
	before (callback) {
		this.init(callback);
	}

	// validate the response to the test request
	validateResponse (data) {
		Assert(data.team.$set.modifiedAt >= this.updatedAt, 'modifiedAt was not changed');
		this.expectedResponse.team.$set.modifiedAt = data.team.$set.modifiedAt;
		Assert.deepEqual(data, this.expectedResponse);
	}
}

module.exports = DeleteBlameMapTest;
